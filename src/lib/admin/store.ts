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
import type { EquipmentSource, PricingSource } from "@/data/types";
import { SEED_ROWS } from "@/data/equipment";
import { SEED_PRICING_SOURCE } from "@/data/pricing";

export const EQUIPMENT_KEY = "data/equipment.json";
export const PRICING_KEY = "data/pricing.json";
export const PHOTO_PREFIX = "equipment";

/**
 * Snapshots live under their OWN prefix, not beside the live file.
 *
 * They used to be written to `${key}.history/…`, which shares a prefix with
 * the live file — so listing "data/pricing.json" matched the snapshots too,
 * and the read sometimes picked one of those instead. The read then reported
 * nothing stored, the version came back empty, and every save was refused with
 * "someone else saved while you were editing". A naming choice, costing a
 * whole afternoon of wrong conclusions.
 */
const HISTORY_PREFIX = "history";

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

/**
 * Deterministic pathnames, not random ones.
 *
 * `addRandomSuffix: false` keeps the live file at a known URL so a read does
 * not have to list the store first. The contents are public either way — they
 * are what the website renders.
 */
async function readJson<T>(
  key: string,
  versionOf: (data: T) => string
): Promise<{ data: T; version: string } | null> {
  /*
   * list() is eventually consistent, in BOTH directions.
   *
   * It can report a blob that has just been deleted, whose URL then 404s, and
   * it can miss one that has just been written. Neither lasts more than a
   * moment, and both produced confusing failures: a save would succeed and the
   * next read would answer "could not read (404)".
   *
   * So a miss is retried rather than believed. Three quick attempts cover the
   * window; after that "not stored" is taken at face value and the seed is
   * served, which is the right answer when the store really is empty.
   */
  for (let attempt = 0; attempt < 3; attempt++) {
    const { blobs } = await list({ prefix: key });
    const hit = blobs.find((b) => b.pathname === key);

    if (hit) {
      unstable_noStore();
      const res = await fetch(hit.url, { cache: "no-store", next: { revalidate: 0 } });

      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text) as T;
          /*
           * The version comes from INSIDE the document, not from blob
           * metadata, for the same reason: metadata lags, and a lagging
           * version turns every save into a spurious "someone else edited
           * this".
           */
          return { data, version: versionOf(data) };
        } catch {
          throw new StoreError(`${key} in the store is not valid JSON`, 422);
        }
      }
      // 404 here means the index is ahead of the content, or behind a delete.
      if (res.status !== 404) {
        throw new StoreError(`Could not read ${key} (${res.status})`, 502);
      }
    }

    if (attempt < 2) await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

async function writeJson(key: string, value: unknown): Promise<void> {
  const body = JSON.stringify(value, null, 2) + "\n";

  // The snapshot goes first. If the live write then fails, there is a spare
  // copy; if the snapshot fails, the live file is untouched. Either way
  // nothing is half-written.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await put(`${HISTORY_PREFIX}/${key}/${stamp}.json`, body, {
    access: "public",
    contentType: "application/json; charset=utf-8",
    addRandomSuffix: false,
  });


  await put(key, body, {
    access: "public",
    contentType: "application/json; charset=utf-8",
    addRandomSuffix: false,
    allowOverwrite: true,
    // Do not let the CDN hold these at all. They are small, read by the server
    // through a cache of its own, and must never be stale after a save.
    cacheControlMaxAge: 0,
  });

}

/* ── Equipment ───────────────────────────────────────────────────────────── */

/** Both documents already stamp the moment they were written; reuse it. */
const equipmentVersion = (d: EquipmentSource) => d._meta?.syncedAt ?? "";
const pricingVersion = (d: PricingSource) => d._meta?.updatedAt ?? "";

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

/* ── Photos ──────────────────────────────────────────────────────────────── */

/** Returns the public URL to store on the row. */
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
  const result = await put(
    `${PHOTO_PREFIX}/${code.toLowerCase()}/${String(index).padStart(2, "0")}.${ext}`,
    bytes,
    { access: "public", contentType, addRandomSuffix: false, allowOverwrite: true }
  );
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
