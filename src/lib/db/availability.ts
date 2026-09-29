import "server-only";

/**
 * Reads a month of availability out of the studio's own calendar.
 *
 * Replaces the Google reader. The DECISION is not here — it is in
 * src/lib/availability-build.ts, which both readers call, so the two cannot
 * produce different answers while both exist. This file only fetches intervals.
 *
 * PRIVACY, AND IT IS NOT A DETAIL
 *
 * /api/availability is public and unauthenticated. The Google version used
 * freebusy rather than events.list precisely because the latter "would publish
 * client names, emails and briefs to anyone with curl". The same danger exists
 * here, one careless `select *` away: `holds` joins to `requests`, and
 * `requests` holds every name, email and brief the studio has.
 *
 * So the query below selects THREE columns — the room and the two ends of the
 * interval — and nothing else, ever. Equipment is aggregated to bare counts in
 * SQL before it leaves the database.
 */

import type { MonthAvailability } from "@/data/availability";
import { emptyMonth } from "@/data/availability";
import { resourcesForSpace } from "@/data/resources";
import type { ResourceId } from "@/data/types";
import type { ISODate } from "@/lib/date";
import { addDays, zonedInstant } from "@/lib/date";
import {
  buildMonth,
  datesInMonth,
  type BusyInterval,
} from "@/lib/availability-build";
import { getCatalogue } from "@/lib/data-source";
import { READ_TIMEOUT_MS, db, isDbConfigured, rows, withTimeout } from "./client";

/**
 * The month's bounds, as real instants.
 *
 * The Google reader pads a day either side to avoid reasoning about which UTC
 * offset a month boundary falls on. That padding is unnecessary here: both
 * ends go through zonedInstant, which is exact. The end is midnight of the day
 * AFTER the last — computed independently, never as `start + 24h`, because the
 * last Sunday in October is twenty-five hours long.
 */
function monthBounds(month: string): { from: ISODate; toExclusive: ISODate } | null {
  const dates = datesInMonth(month);
  if (dates.length === 0) return null;
  return { from: dates[0], toExclusive: addDays(dates[dates.length - 1], 1) };
}

export async function readMonthAvailability(
  spaceId: string,
  month: string
): Promise<MonthAvailability> {
  if (!isDbConfigured()) return emptyMonth(spaceId, month, true);

  const resources = resourcesForSpace(spaceId);
  if (resources.length === 0) return emptyMonth(spaceId, month, true);

  const bounds = monthBounds(month);
  if (!bounds) return emptyMonth(spaceId, month, true);

  const startMs = zonedInstant(bounds.from, "00:00");
  const endMs = zonedInstant(bounds.toExclusive, "00:00");
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();

  try {
    const sql = db();

    /*
     * Both rooms, always, whatever the product asked about — equipment is
     * shared between them and `both` needs each one anyway.
     *
     * epoch * 1000 cast to float8 so the value arrives as a plain JS number.
     * Returning the timestamptz itself would leave the parsing to the driver,
     * and the builder wants milliseconds.
     */
    const [intervals, used] = await withTimeout(
      Promise.all([
        rows<{ resource_id: string; start_ms: number; end_ms: number }>(sql`
          select resource_id,
                 (extract(epoch from lower(during)) * 1000)::float8 as start_ms,
                 (extract(epoch from upper(during)) * 1000)::float8 as end_ms
            from holds
           where during && tstzrange(${startIso}::timestamptz, ${endIso}::timestamptz, '[)')
        `),
        /*
         * Only confirmed work holds gear. This is the rule the Google version
         * had — it skipped transparent events — and it matters: counting
         * unactioned requests would let one stale enquiry make an item look
         * sold out indefinitely.
         *
         * `#>> '{}'` extracts the jsonb scalar as text before the int cast;
         * `value::int` is a type error and `value::text::int` breaks on a
         * quoted number.
         */
        rows<{ date: string; code: string; used: number }>(sql`
          select r.date::text as date,
                 e.key as code,
                 sum((e.value #>> '{}')::int)::int as used
            from requests r, lateral jsonb_each(r.equipment) as e
           where r.status in ('confirmed','done')
             and r.equipment is not null
             and r.date >= ${bounds.from}::date
             and r.date <  ${bounds.toExclusive}::date
           group by 1, 2
        `),
      ]),
      READ_TIMEOUT_MS,
      "availability read"
    );

    const busyByResource: Partial<Record<ResourceId, BusyInterval[]>> = {};
    for (const row of intervals) {
      const rid = row.resource_id as ResourceId;
      (busyByResource[rid] ??= []).push({ start: row.start_ms, end: row.end_ms });
    }

    const usedByDate: Record<ISODate, Record<string, number>> = {};
    for (const row of used) {
      (usedByDate[row.date] ??= {})[row.code] = row.used;
    }

    return buildMonth({
      spaceId,
      month,
      busyByResource,
      usedByDate,
      items: (await getCatalogue()).allItems,
    });
  } catch (err) {
    /*
     * A failed read must NEVER answer "free".
     *
     * slotState() treats a missing day as free, so an empty month with
     * degraded:false would have the site promising slots it never checked.
     * The degraded flag exists for exactly this, and the UI already renders it
     * as "availability unconfirmed".
     */
    console.error("[DB] availability read failed", err);
    return emptyMonth(spaceId, month, true);
  }
}

/* ── Cache ───────────────────────────────────────────────────────────────── */

/**
 * A few seconds of cache, and the reason is NOT latency.
 *
 * Same-region Neon answers this in single-digit milliseconds, so the read is
 * cheap. But /api/availability is public and unauthenticated, and the rate
 * limiter in guard.ts is per serverless instance and admits as much ("the real
 * limit is looser than configured"). Without a cache, anything hitting that
 * endpoint in a loop is hitting the database in a loop, and the free compute
 * plan is metered by the hour.
 *
 * Unlike the Google version's TTL, this one is not load-bearing for
 * correctness: we are the only writer, so every change purges it. The TTL is
 * only the ceiling for instances that did not serve the write.
 *
 * Plain variables, not unstable_cache — this project has measured twice that
 * unstable_cache does not release on revalidateTag, on revalidatePath, or on
 * its own TTL. See src/lib/data-source.ts.
 */
const TTL_MS = 5_000;
const slots = new Map<string, { value: MonthAvailability; at: number }>();

export async function readMonthAvailabilityCached(
  spaceId: string,
  month: string
): Promise<MonthAvailability> {
  const key = `${spaceId}:${month}`;
  const hit = slots.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const value = await readMonthAvailability(spaceId, month);
  // Never cache a degraded answer: it would keep a transient database blip on
  // screen after the database came back.
  if (!value.degraded) slots.set(key, { value, at: Date.now() });
  return value;
}

/** Called after anything that changes a hold, in the process that changed it. */
export function purgeAvailability(): void {
  slots.clear();
}
