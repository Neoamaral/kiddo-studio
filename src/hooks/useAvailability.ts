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

/** Survives remounts within a page view; a reload is a fresh read. */
const cache = new Map<string, MonthAvailability>();

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
    if (hit) {
      setState({ status: "ready", data: hit });
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
        cache.set(key, data);
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
