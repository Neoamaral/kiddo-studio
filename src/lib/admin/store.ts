/**
 * Where the editable data actually lives: Vercel Blob.
 *
 * WHY NOT THE REPOSITORY
 *
 * Writing the repository meant the studio had to create a GitHub token to use
 * their own admin panel. A panel with a login on the site should not send
 * anyone somewhere else to work. Blob is part of the project — Vercel injects
 * BLOB_READ_WRITE_TOKEN when the store is connected, so there is nothing to
 * copy and nothing to renew.
 *
 * WHAT IS LOST, AND HOW IT IS REPLACED
 *
 * Git gave version history and rollback for free. Blob does not, so every save
 * also writes a dated snapshot next to the live file. Without that, one bad
 * save would have no way back.
 */

import { put, list, del } from "@vercel/blob";
import { unstable_noStore } from "next/cache";
import type { ContactSource, EquipmentSource, PricingSource } from "@/data/types";
import { SEED_ROWS } from "@/data/equipment";
import { SEED_PRICING_SOURCE } from "@/data/pricing";
import { SEED_CONTACT_SOURCE } from "@/data/contact";

export const EQUIPMENT_KEY = "data/equipment.json";
export const PRICING_KEY = "data/pricing.json";
export const CONTACT_KEY = "data/contact.json";
export const PHOTO_PREFIX = "equipment";

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status: number = 500
  ) {
    super(message);
  }
}

/** A save carries the version it was based on, so two editors cannot silently overwrite. */
export interface Versioned<T> {
  data: T;
  /** Empty when nothing has been saved yet and the seed is being served. */
  version: string;
  /** True while the seed is in use — nothing has ever been saved. */
  seeded: boolean;
}

export function isConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/*
 * EVERY SAVE WRITES A NEW PATHNAME. THIS IS NOT OPTIONAL.
 *
 * The obvious design — one file per document, overwritten in place — does not
 * work on Vercel Blob, and it fails quietly, which is worse.
 *
 * `cacheControlMaxAge: 0` does not mean no caching: the CDN clamps it and
 * serves `public, max-age=60`. A pathname that never changes therefore has a
 * URL that never changes, so once a page render has warmed the edge, every
 * later read is an `x-vercel-cache: HIT` of the OLD bytes. Measured: a save
 * landed, and the store went on reporting the previous value for between three
 * and fifty-six seconds. The panel said "live on the site now" and was wrong.
 *
 * A cache-busting query string does not help — the blob CDN keys on the path,
 * not the query, so `?v=…` came back HIT and stale too. Measured, not assumed.
 *
 * So each save writes `data/pricing/<timestamp>.json`, a URL that has never
 * been requested and cannot be a hit, and a read lists that folder and takes
 * the newest. The index is eventually consistent, which is a window of a
 * moment rather than a minute, and it is retried.
 *
 * This replaces the separate history folder: the older versions ARE the
 * history, and pruning keeps the newest few.
 */
const KEEP_VERSIONS = 20;

/** "data/pricing.json" -> "data/pricing/" */
function versionDir(key: string): string {
  return key.replace(/\.json$/, "") + "/";
}

/** Newest first. ISO timestamps sort lexicographically, which is the point. */
function newestFirst(paths: { pathname: string; url: string }[], dir: string) {
  return paths
    .filter((b) => b.pathname.startsWith(dir) && b.pathname.endsWith(".json"))
    .sort((a, b) => (a.pathname < b.pathname ? 1 : a.pathname > b.pathname ? -1 : 0));
}

async function fetchJson<T>(url: string, key: string): Promise<T | null> {
  unstable_noStore();
  const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
  if (res.status === 404) return null; // the index is ahead of the content
  if (!res.ok) throw new StoreError(`Could not read ${key} (${res.status})`, 502);
  try {
    return JSON.parse(await res.text()) as T;
  } catch {
    throw new StoreError(`${key} in the store is not valid JSON`, 422);
  }
}

async function readJson<T>(
  key: string,
  versionOf: (data: T) => string
): Promise<{ data: T; version: string } | null> {
  const dir = versionDir(key);

  /*
   * list() is eventually consistent in BOTH directions: it can miss a blob
   * written a moment ago and report one deleted a moment ago. A miss is
   * retried rather than believed; after three quick attempts, "nothing
   * stored" is taken at face value, which is the right answer for an empty
   * store.
   */
  for (let attempt = 0; attempt < 3; attempt++) {
    const { blobs } = await list({ prefix: dir });
    const versions = newestFirst(blobs, dir);

    // The newest, and the one before it in case the index is ahead of the
    // content and the newest URL 404s.
    for (const candidate of versions.slice(0, 2)) {
      const data = await fetchJson<T>(candidate.url, key);
      if (data) return { data, version: versionOf(data) };
    }

    if (versions.length === 0) {
      /*
       * Nothing in the versioned folder. This is either a store that has
       * never been written, or one written by the earlier single-file
       * arrangement — so look for that file before concluding it is empty.
       * The next save moves it into the folder and this stops mattering.
       */
      const legacy = await list({ prefix: key });
      const hit = legacy.blobs.find((b) => b.pathname === key);
      if (hit) {
        const data = await fetchJson<T>(hit.url, key);
        if (data) return { data, version: versionOf(data) };
      }
    }

    if (attempt < 2) await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

async function writeJson(key: string, value: unknown): Promise<void> {
  /*
   * A Buffer, not a string.
   *
   * put() given a string leaves the encoding to the transport, and the
   * accented text and em-dashes in this catalogue are exactly the bytes
   * that suffer when something re-encodes them. A Buffer says "these bytes,
   * as they are", and the charset below says how to read them back.
   */
  const body = Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");

  const dir = versionDir(key);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await put(`${dir}${stamp}.json`, body, {
    access: "public",
    contentType: "application/json; charset=utf-8",
    addRandomSuffix: false,
  });

  // Pruning is best-effort and comes AFTER the write that matters. A store
  // that keeps a few files too many is untidy; one that fails a save because
  // housekeeping threw is broken.
  try {
    const { blobs } = await list({ prefix: dir });
    const stale = newestFirst(blobs, dir).slice(KEEP_VERSIONS);
    if (stale.length) await del(stale.map((b) => b.url));
  } catch (err) {
    console.error("[STORE] could not prune old versions", err);
  }
}

/* ── Equipment ───────────────────────────────────────────────────────────── */

/** Both documents already stamp the moment they were written; reuse it. */
const equipmentVersion = (d: EquipmentSource) => d._meta?.syncedAt ?? "";
const pricingVersion = (d: PricingSource) => d._meta?.updatedAt ?? "";
const contactVersion = (d: ContactSource) => d._meta?.updatedAt ?? "";

export async function readEquipment(): Promise<Versioned<EquipmentSource>> {
  if (isConfigured()) {
    const stored = await readJson<EquipmentSource>(EQUIPMENT_KEY, equipmentVersion);
    if (stored) return { ...stored, seeded: false };
  }
  // Nothing saved yet, or no store: serve what ships with the site rather than
  // an empty catalogue.
  return {
    data: { _meta: seedMeta(SEED_ROWS.length), rows: [...SEED_ROWS] },
    version: "",
    seeded: true,
  };
}

function seedMeta(rowCount: number): EquipmentSource["_meta"] {
  return {
    source: "Seed shipped with the site — nothing saved in the panel yet",
    notionPageId: "",
    syncedAt: "",
    rowCount,
    vatIncluded: false,
    photoCount: 0,
  };
}

export async function writeEquipment(
  data: EquipmentSource,
  expectedVersion: string
): Promise<string> {
  await assertVersion(EQUIPMENT_KEY, expectedVersion, equipmentVersion);
  await writeJson(EQUIPMENT_KEY, data);
  return equipmentVersion(data);
}

/* ── Pricing ─────────────────────────────────────────────────────────────── */

export async function readPricing(): Promise<Versioned<PricingSource>> {
  if (isConfigured()) {
    const stored = await readJson<PricingSource>(PRICING_KEY, pricingVersion);
    if (stored) return { ...stored, seeded: false };
  }
  return { data: SEED_PRICING_SOURCE, version: "", seeded: true };
}

export async function writePricing(
  data: PricingSource,
  expectedVersion: string
): Promise<string> {
  await assertVersion(PRICING_KEY, expectedVersion, pricingVersion);
  await writeJson(PRICING_KEY, data);
  return pricingVersion(data);
}

/**
 * Refuses a save built on a version that is no longer current.
 *
 * An empty expected version means "I was editing the seed" and is only
 * accepted while nothing has been saved — otherwise a stale tab could wipe
 * real data by claiming it started from nothing.
 */
async function assertVersion<T>(
  key: string,
  expected: string,
  versionOf: (data: T) => string
): Promise<void> {
  if (!isConfigured()) {
    throw new StoreError(
      "Storage is not connected, so nothing can be saved yet.",
      503
    );
  }
  const current = await readJson<T>(key, versionOf);
  const currentVersion = current?.version ?? "";
  if (currentVersion !== expected) {
    throw new StoreError(
      "Someone else saved while you were editing. Reload the page and redo your change.",
      409
    );
  }
}

/* ── Contact ─────────────────────────────────────────────────────────────── */

export async function readContact(): Promise<Versioned<ContactSource>> {
  if (isConfigured()) {
    const stored = await readJson<ContactSource>(CONTACT_KEY, contactVersion);
    if (stored) return { ...stored, seeded: false };
  }
  return { data: SEED_CONTACT_SOURCE, version: "", seeded: true };
}

export async function writeContact(
  data: ContactSource,
  expectedVersion: string
): Promise<string> {
  await assertVersion(CONTACT_KEY, expectedVersion, contactVersion);
  await writeJson(CONTACT_KEY, data);
  return contactVersion(data);
}

/* ── Photos ──────────────────────────────────────────────────────────────── */

/**
 * Returns the public URL to store on the row.
 *
 * The filename carries a stamp for the same reason the data files do: a
 * pathname that never changes has a URL the CDN caches for a minute, so
 * replacing a photo went on showing the old one. A new name cannot be a cache
 * hit. The previous file in that slot is then removed, so a slot still holds
 * exactly one photo.
 */
export async function putPhoto(
  code: string,
  index: number,
  bytes: Buffer,
  contentType: string,
  ext: string
): Promise<string> {
  if (!isConfigured()) {
    throw new StoreError("Storage is not connected, so photos cannot be uploaded.", 503);
  }
  const dir = `${PHOTO_PREFIX}/${code.toLowerCase()}/`;
  const slot = String(index).padStart(2, "0");

  const result = await put(`${dir}${slot}-${Date.now().toString(36)}.${ext}`, bytes, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });

  // Best-effort, and only after the new file exists: a slot left holding two
  // photos is untidy, a failed upload is not.
  try {
    const { blobs } = await list({ prefix: dir });
    const previous = blobs.filter(
      (b) => b.pathname.startsWith(`${dir}${slot}`) && b.url !== result.url
    );
    if (previous.length) await del(previous.map((b) => b.url));
  } catch (err) {
    console.error("[STORE] could not remove the previous photo", err);
  }

  return result.url;
}

export async function deletePhoto(url: string): Promise<void> {
  if (!isConfigured()) return;
  await del(url);
}

/** Everything currently stored, for the housekeeping check. */
export async function listAll(prefix = ""): Promise<{ pathname: string; size: number }[]> {
  if (!isConfigured()) return [];
  const { blobs } = await list({ prefix, limit: 1000 });
  return blobs.map((b) => ({ pathname: b.pathname, size: b.size }));
}
