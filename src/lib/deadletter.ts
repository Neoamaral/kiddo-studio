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
 */

import { put } from "@vercel/blob";
import { listAll } from "@/lib/admin/store";

export const DEADLETTER_PREFIX = "deadletter/requests";

export async function deadLetter(ref: string, payload: unknown): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  try {
    await put(
      `${DEADLETTER_PREFIX}/${stamp}-${ref}.json`,
      // A Buffer, not a string — the same encoding lesson as the rest of the
      // store. A brief with accents must come back byte-identical.
      Buffer.from(JSON.stringify(payload, null, 2) + "\n", "utf8"),
      {
        access: "public",
        contentType: "application/json; charset=utf-8",
        addRandomSuffix: false,
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
