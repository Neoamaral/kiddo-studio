/**
 * The booking wizard's step machine — one ordered definition, used by both the
 * stepper bar and the cards.
 *
 * Previously the labels lived in a STEP_LABELS array AND as hardcoded
 * number="01" label="…" props on every card, and the two could silently
 * desync. Advancement was `setActiveStep(3)` literals, and the stepper bar was
 * a free jump into steps whose prerequisites did not exist.
 *
 * ORDER MATTERS AND IS NOT PREFERENCE: space has no prerequisite; the date
 * needs to know which calendars to query; the slot needs date AND space;
 * equipment stock is per-date.
 */

import type { ISODate } from "@/lib/date";

export type StepId = "space" | "date" | "slot" | "addons" | "equipment" | "details";

/** Just what the gate needs — deliberately not the whole form state. */
export interface BookingSelection {
  spaceId: string;
  date: ISODate | null;
  slotId: string;
  name: string;
  email: string;
}

export interface StepDef {
  id: StepId;
  /** Stepper bar. */
  navLabel: string;
  /** Card header. */
  cardLabel: string;
  /** Satisfied enough to open the NEXT step. */
  isComplete: (s: BookingSelection) => boolean;
}

export const STEPS: readonly StepDef[] = [
  {
    id: "space",
    navLabel: "SPACE",
    cardLabel: "WHICH SPACE?",
    isComplete: (s) => !!s.spaceId,
  },
  {
    id: "date",
    navLabel: "DATE",
    cardLabel: "PICK A DATE",
    isComplete: (s) => !!s.date,
  },
  {
    id: "slot",
    navLabel: "SLOT",
    cardLabel: "WHEN?",
    isComplete: (s) => !!s.slotId,
  },
  {
    id: "addons",
    navLabel: "ADD-ONS",
    cardLabel: "WANT EXTRAS?",
    isComplete: () => true,
  },
  {
    id: "equipment",
    navLabel: "GEAR",
    cardLabel: "NEED GEAR?",
    isComplete: () => true,
  },
  {
    id: "details",
    navLabel: "DETAILS",
    cardLabel: "YOUR DETAILS",
    isComplete: (s) => !!s.name.trim() && !!s.email.trim(),
  },
];

export const LAST_STEP = STEPS.length - 1;

export function stepIndex(id: StepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

/** Two-digit badge. Derived, so the bar and the card can never disagree. */
export function stepNumber(i: number): string {
  return String(i + 1).padStart(2, "0");
}

/** The furthest step the user may open: the first unsatisfied one. */
export function furthestOpenIndex(s: BookingSelection): number {
  const i = STEPS.findIndex((step) => !step.isComplete(s));
  return i === -1 ? LAST_STEP : i;
}

export function canOpen(i: number, s: BookingSelection): boolean {
  return i <= furthestOpenIndex(s);
}

/** Everything required to submit. Mirrors the API's own validation. */
export function isSubmittable(s: BookingSelection): boolean {
  return STEPS.every((step) => step.isComplete(s));
}
