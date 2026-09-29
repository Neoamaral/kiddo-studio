/**
 * Weekend and public-holiday surcharge.
 *
 * "Weekend and holiday bookings carry a 20% surcharge on all applicable rates."
 *
 * Until now WEEKEND_MULTIPLIER existed but only the pricing page's toggle ever
 * read it — no actual booking was ever quoted with it. This module is what
 * makes the rule real, and computeQuote() is its only caller that matters.
 *
 * Integer civil-calendar arithmetic throughout, reusing src/lib/date.ts: the
 * booking grid renders on a server in UTC and in visitors' browsers in
 * arbitrary zones, and `new Date("2026-12-25").getDay()` is a timezone trap.
 */

import { addDays, dayOfWeek, isoDate, parseISO, type ISODate } from "./date";
import { WEEKEND_MULTIPLIER } from "@/data/pricing";

/** Saturday or Sunday. dayOfWeek is Sakamoto's, 0 = Sunday. */
export function isWeekend(iso: ISODate): boolean {
  const d = parseISO(iso);
  if (!d) return false;
  const dow = dayOfWeek(d.y, d.m1, d.d);
  return dow === 0 || dow === 6;
}

/**
 * Portuguese national public holidays with a fixed date.
 * [month, day] — Carnaval is deliberately absent: it is not a mandatory
 * national holiday. If the studio closes for it, add Easter - 47 below.
 */
const FIXED_HOLIDAYS: readonly (readonly [number, number])[] = [
  [1, 1],   // Ano Novo
  [4, 25],  // Dia da Liberdade
  [5, 1],   // Dia do Trabalhador
  [6, 10],  // Dia de Portugal
  [8, 15],  // Assunção de Nossa Senhora
  [10, 5],  // Implantação da República
  [11, 1],  // Todos os Santos
  [12, 1],  // Restauração da Independência
  [12, 8],  // Imaculada Conceição
  [12, 25], // Natal
];

/**
 * Easter Sunday, Gregorian — the "Anonymous Gregorian algorithm" (Meeus/Jones/
 * Butcher). Pure integer arithmetic, exact for every year in the Gregorian
 * calendar, so the movable holidays below need no lookup table to maintain.
 */
export function easterSunday(year: number): { m1: number; d: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { m1: month, d: day };
}

/** Days relative to Easter Sunday for the movable national holidays. */
const EASTER_OFFSETS: readonly number[] = [
  -2, // Sexta-feira Santa
  0, // Páscoa
  60, // Corpo de Deus
];

/**
 * The movable holidays of a year, as ISO dates.
 *
 * Walks from Easter with addDays() rather than doing calendar maths here —
 * date.ts already owns days_from_civil, and a second copy of it would be free
 * to drift from the first.
 */
function movableHolidays(y: number): ISODate[] {
  const easter = easterSunday(y);
  const easterISO = isoDate(y, easter.m1, easter.d);
  return EASTER_OFFSETS.map((off) => addDays(easterISO, off));
}

/** Every national holiday in a year, as sorted ISO dates. */
export function holidaysInYear(y: number): ISODate[] {
  return [
    ...FIXED_HOLIDAYS.map(([m1, d]) => isoDate(y, m1, d)),
    ...movableHolidays(y),
  ].sort();
}

export function isPortugueseHoliday(iso: ISODate): boolean {
  const date = parseISO(iso);
  if (!date) return false;

  for (const [m1, d] of FIXED_HOLIDAYS) {
    if (date.m1 === m1 && date.d === d) return true;
  }
  // ISO dates compare as strings, so no parsing needed on this side.
  return movableHolidays(date.y).includes(iso);
}

/** Why a booking is being surcharged — so the summary can say which it is. */
export type SurchargeReason = "weekend" | "holiday" | null;

export function surchargeReason(iso: ISODate | null | undefined): SurchargeReason {
  if (!iso) return null;
  if (isPortugueseHoliday(iso)) return "holiday";
  if (isWeekend(iso)) return "weekend";
  return null;
}

/** 1.2 on a weekend or public holiday, 1 otherwise. */
export function surchargeMultiplier(iso: ISODate | null | undefined): number {
  return surchargeReason(iso) ? WEEKEND_MULTIPLIER : 1;
}
