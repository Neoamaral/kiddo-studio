import "server-only";

/**
 * Where a request goes when the database will not take it.
 *
 * WHY THIS EXISTS, SAID PLAINLY
 *
 * When Google Calendar was the store, a failed write still left two safety
 * nets: the studio's own calendar, which they look at daily, and the
 * notification email. With Postgres as the only store, a failed write leaves
 * the request in an email and nowhere else — and that email is written for a
 * human. It prints "Cyclorama" rather than `cyc`, it omits the idempotency
 * key, the add-on ids and the equipment codes. The row cannot be rebuilt from
 * it.
 *
 * So the raw payload is written to Vercel Blob, which is a different vendor
 * from the database: "both down at once" is a genuinely rare event rather than
 * one outage. The admin panel lists what is there and offers to replay it.
 *
 * This turns the unrecoverable case from "the database and the email failed"
 * into "the database, the email AND the blob store failed".
 *
 * One attempt, no retry loop. A retry holds the function open and makes the
 * customer wait through a database that is already not answering.
 *
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY THE PAYLOAD IS SEALED, AND WHY IT IS STILL WRITTEN WHEN SEALING FAILS
 * ────────────────────────────────────────────────────────────────────────────
 *
 * This file used to write the raw booking — name, email, phone, company,
 * brief — with `access: "public"` and `addRandomSuffix: false`. The blob store
 * id is already public knowledge, because equipment photo URLs from the same
 * store are rendered into public HTML. So the only thing standing between a
 * stranger and a customer's personal data was guessing a millisecond
 * timestamp. That is not access control.
 *
 * `access: "private"` would have been the clean fix and is NOT available: the
 * store is configured public, and it cannot be switched without breaking every
 * equipment photo and the admin document reads. Measured, not assumed —
 * Vercel answers "Cannot use private access on a public store."
 *
 * So two layers, and the ordering between them is the whole point:
 *
 *   1. addRandomSuffix: true  — the path stops being enumerable. This costs
 *      nothing, depends on nothing, and is therefore the layer that must never
 *      be conditional.
 *
 *   2. The payload is sealed with SETTINGS_KEY. This is the layer that
 *      actually protects the content — and it is the layer that can fail,
 *      because a key can be missing or rotated.
 *
 * WHEN SEALING FAILS, THE RECORD IS STILL WRITTEN. Refusing to write would
 * mean a missing environment variable silently removes the last safety net at
 * the exact moment it is needed, which is a worse failure than the one being
 * fixed: an unguessable URL versus a booking that exists nowhere but an email
 * written for a human. The envelope says `sealed: false`, the server logs it
 * loudly, and the admin panel can see it — so it is a visible degradation
 * rather than a silent one.
 *
 * `ref` and `createdAt` sit OUTSIDE the sealed payload on purpose: the panel
 * must be able to list and identify what is waiting without holding the key,
 * and neither of them is personal data.
 */

import { get, put } from "@vercel/blob";
import { listAll } from "@/lib/admin/store";
import { open, seal, SecretUnreadable } from "@/lib/crypto/secretbox";

export const DEADLETTER_PREFIX = "deadletter/requests";

/** Binds a sealed payload to this field. See secretbox.ts on AAD. */
const AAD = "kiddo:deadletter:payload";

export interface DeadLetterEnvelope {
  v: 1;
  ref: string;
  createdAt: string;
  sealed: boolean;
  /** A sealed record when `sealed`, otherwise the raw payload. */
  payload: unknown;
}

export async function deadLetter(ref: string, payload: unknown): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const body = JSON.stringify(payload);
  let envelope: DeadLetterEnvelope;
  try {
    envelope = {
      v: 1,
      ref,
      createdAt: new Date().toISOString(),
      sealed: true,
      payload: seal(body, AAD),
    };
  } catch (err) {
    // The key is missing or malformed. Write anyway — see the header.
    console.error(
      `[BOOKING ${ref}] dead-letter could NOT be sealed, writing in the clear at an unguessable path. Set SETTINGS_KEY.`,
      err
    );
    envelope = { v: 1, ref, createdAt: new Date().toISOString(), sealed: false, payload };
  }

  try {
    await put(
      `${DEADLETTER_PREFIX}/${stamp}-${ref}.json`,
      // A Buffer, not a string — the same encoding lesson as the rest of the
      // store. A brief with accents must come back byte-identical.
      Buffer.from(JSON.stringify(envelope, null, 2) + "\n", "utf8"),
      {
        access: "public",
        contentType: "application/json; charset=utf-8",
        // NOT false. A deterministic path plus a publicly known store id is an
        // enumerable archive of other people's personal data.
        addRandomSuffix: true,
      }
    );
    return true;
  } catch (err) {
    console.error(`[BOOKING ${ref}] dead-letter write ALSO failed`, err);
    return false;
  }
}

/** For the admin banner: what is waiting to be replayed. */
export async function listDeadLetters(): Promise<{ pathname: string; size: number }[]> {
  return listAll(DEADLETTER_PREFIX + "/");
}

export type DeadLetterRead =
  | { ok: true; ref: string; createdAt: string; sealed: boolean; payload: unknown }
  | { ok: false; ref: string | null; reason: "not-found" | "unreadable" | "key-changed" | "corrupt" };

/**
 * Reads one back for replay.
 *
 * Reports `key-changed` distinctly from `corrupt` for the same reason the
 * panel distinguishes them for the Meta token: one is answerable ("the key was
 * rotated, here is which one wrote it"), the other is not, and collapsing them
 * sends someone hunting for an attacker who is not there.
 */
export async function readDeadLetter(pathname: string): Promise<DeadLetterRead> {
  let text: string;
  try {
    const res = await get(pathname, { access: "public", useCache: false });
    if (!res) return { ok: false, ref: null, reason: "not-found" };
    text = await new Response(res.stream).text();
  } catch {
    return { ok: false, ref: null, reason: "not-found" };
  }

  let env: DeadLetterEnvelope;
  try {
    env = JSON.parse(text) as DeadLetterEnvelope;
  } catch {
    return { ok: false, ref: null, reason: "corrupt" };
  }
  const ref = typeof env?.ref === "string" ? env.ref : null;

  // Written before this change: the whole file WAS the payload.
  if (!env || env.v !== 1) {
    return { ok: true, ref: ref ?? "", createdAt: "", sealed: false, payload: env };
  }
  if (!env.sealed) {
    return { ok: true, ref: env.ref, createdAt: env.createdAt, sealed: false, payload: env.payload };
  }

  try {
    const json = open(String(env.payload), AAD);
    return { ok: true, ref: env.ref, createdAt: env.createdAt, sealed: true, payload: JSON.parse(json) };
  } catch (err) {
    if (err instanceof SecretUnreadable && err.reason === "key-changed") {
      return { ok: false, ref, reason: "key-changed" };
    }
    return { ok: false, ref, reason: "unreadable" };
  }
}
