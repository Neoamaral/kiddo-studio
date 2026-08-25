"use client";

/**
 * Month availability for a space.
 *
 * PHASE 1 (now): returns an all-free month flagged `degraded`, synchronously
 * and with no network. The UI therefore says "we'll confirm by email" rather
 * than claiming a slot is free when nothing has been checked.
 *
 * PHASE 2: swap the body for a fetch of /api/availability with an
 * AbortController and a module-scope cache. No consumer changes — which is the
 * entire reason this hook exists before the integration does.
 */

import { useEffect, useState } from "react";
import type { MonthAvailability } from "@/data/availability";
import { emptyMonth } from "@/data/availability";

export type AvailabilityState =
  | { status: "idle" }
  | { status: "loading"; month: string }
  | { status: "ready"; data: MonthAvailability }
  | { status: "error"; message: string };

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
    // Phase 1 stub. emptyMonth() reads the clock, which is why it is called
    // here in an effect and never during render — /booking is statically
    // prerendered and a render-path clock read bakes the build date into the
    // shipped HTML.
    setState({ status: "ready", data: emptyMonth(spaceId, month, true) });
  }, [spaceId, month]);

  return state;
}

/** The month payload, or null while idle/loading/errored. */
export function availabilityData(s: AvailabilityState): MonthAvailability | null {
  return s.status === "ready" ? s.data : null;
}
