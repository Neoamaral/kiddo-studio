"use client";

/**
 * Month availability for a space, from /api/availability.
 *
 * The endpoint fails open: on any upstream problem it returns `degraded: true`
 * rather than an error, so the only way this hook reaches "error" is a network
 * failure on our own origin.
 *
 * No component changed when this stopped being a stub — that was the point of
 * introducing the hook before the integration existed.
 */

import { useEffect, useState } from "react";
import type { MonthAvailability } from "@/data/availability";
import { emptyMonth } from "@/data/availability";

export type AvailabilityState =
  | { status: "idle" }
  | { status: "loading"; month: string }
  | { status: "ready"; data: MonthAvailability }
  | { status: "error"; message: string };

/**
 * Survives remounts within a page view, but only briefly: a tab left open
 * while a booking is confirmed — or while the studio frees a slot by deleting
 * the event — would otherwise keep showing what was true when it loaded.
 *
 * Short enough that a human never notices it; long enough to absorb flicking
 * between months and back, which is the only burst worth absorbing.
 */
const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { at: number; data: MonthAvailability }>();

export function invalidateAvailability(spaceId?: string) {
  if (!spaceId) {
    cache.clear();
    return;
  }
  for (const key of [...cache.keys()]) {
    if (key.startsWith(`${spaceId}:`)) cache.delete(key);
  }
}

export function useAvailability(
  spaceId: string | null,
  month: string | null
): AvailabilityState {
  const [state, setState] = useState<AvailabilityState>({ status: "idle" });

  useEffect(() => {
    if (!spaceId || !month) {
      setState({ status: "idle" });
      return;
    }

    const key = `${spaceId}:${month}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      setState({ status: "ready", data: hit.data });
      return;
    }

    const ctrl = new AbortController();
    setState({ status: "loading", month });

    fetch(`/api/availability?space=${encodeURIComponent(spaceId)}&month=${month}`, {
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`availability ${res.status}`);
        return (await res.json()) as MonthAvailability;
      })
      .then((data) => {
        cache.set(key, { at: Date.now(), data });
        setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Degrade rather than block: an unreachable endpoint must not stop
        // someone booking. `degraded` makes the UI say so honestly.
        setState({ status: "ready", data: emptyMonth(spaceId, month, true) });
      });

    return () => ctrl.abort();
  }, [spaceId, month]);

  return state;
}

/** The month payload, or null while idle/loading/errored. */
export function availabilityData(s: AvailabilityState): MonthAvailability | null {
  return s.status === "ready" ? s.data : null;
}
