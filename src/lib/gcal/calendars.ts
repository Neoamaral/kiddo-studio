/**
 * Resource -> Google Calendar id.
 *
 * SERVER ONLY. This is deliberately not in src/data/resources.ts, which the
 * client bundle imports — calendar ids are configuration, not public data.
 */

import type { ResourceId } from "@/data/types";

const ENV_BY_RESOURCE: Record<ResourceId, string> = {
  "room-cyc": "GCAL_CAL_ROOM_CYC",
  "room-blk": "GCAL_CAL_ROOM_BLK",
};

export class MissingCalendarError extends Error {}

/** Throws when unset — see the lazy-throw convention in src/lib/magnific.ts. */
export function calendarIdFor(resource: ResourceId): string {
  const key = ENV_BY_RESOURCE[resource];
  const id = process.env[key];
  if (!id) {
    throw new MissingCalendarError(
      `${key} is not set — see scripts/setup-google-calendar.md`
    );
  }
  return id;
}

export function allCalendarIds(): Record<ResourceId, string> {
  return {
    "room-cyc": calendarIdFor("room-cyc"),
    "room-blk": calendarIdFor("room-blk"),
  };
}

/** True when every room has a calendar id configured. */
export function hasAllCalendars(): boolean {
  return (Object.values(ENV_BY_RESOURCE) as string[]).every((k) => !!process.env[k]);
}
