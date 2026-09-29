/**
 * The availability cache, on its own.
 *
 * Separate from the reader so that writing a hold does not drag the equipment
 * catalogue, the blob store and next/cache in behind it. holds.ts only needs
 * to say "that answer is stale now"; it has no business importing the thing
 * that computes the answer.
 *
 * No "server-only" marker and no imports at all, deliberately: this is a Map
 * and two functions.
 */

import type { MonthAvailability } from "@/data/availability";

/**
 * A few seconds, and the reason is NOT latency.
 *
 * Same-region Postgres answers the availability read in single-digit
 * milliseconds. But /api/availability is public and unauthenticated, and the
 * rate limiter in guard.ts is per serverless instance and says so itself ("the
 * real limit is looser than configured"). Without this, anything polling that
 * endpoint polls the database, and the compute plan is metered by the hour.
 *
 * Unlike the Google version's TTL, this one is not load-bearing for
 * correctness: we are the only writer, so every change purges it. The TTL is
 * only the ceiling for instances that did not serve the write.
 *
 * Plain variables, not unstable_cache — measured twice in this project not to
 * release on revalidateTag, on revalidatePath, or on its own TTL. See
 * src/lib/data-source.ts.
 */
const TTL_MS = 5_000;

const slots = new Map<string, { value: MonthAvailability; at: number }>();

export function cachedMonth(key: string): MonthAvailability | null {
  const hit = slots.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  return null;
}

export function rememberMonth(key: string, value: MonthAvailability): void {
  // Never remember a degraded answer: it would hold a transient database blip
  // on screen after the database had come back.
  if (!value.degraded) slots.set(key, { value, at: Date.now() });
}

/** Called after anything that changes a hold, in the process that changed it. */
export function purgeAvailability(): void {
  slots.clear();
}
