/**
 * Civil-calendar arithmetic, zero dependencies.
 *
 * Everything here works on INTEGERS rather than `Date` objects on purpose. The
 * booking grid renders on a server in UTC and in visitors' browsers in
 * arbitrary zones; integer arithmetic on year/month/day has no timezone to get
 * wrong. The only functions that touch a timezone are the two at the bottom,
 * and they go through `Intl` rather than hand-rolled DST rules.
 */

/** "YYYY-MM-DD". Not branded — validate with parseISO at trust boundaries. */
export type ISODate = string;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Monday-first labels; the studio's audience is Portuguese. */
export const DOW_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** m1 is 1-based (1 = January). */
export function isoDate(y: number, m1: number, d: number): ISODate {
  return `${y}-${pad2(m1)}-${pad2(d)}`;
}

export interface YMD {
  y: number;
  m1: number;
  d: number;
}

/** Strict: rejects "2026-02-30" and anything that isn't exactly YYYY-MM-DD. */
export function parseISO(s: unknown): YMD | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const m1 = Number(m[2]);
  const d = Number(m[3]);
  if (m1 < 1 || m1 > 12) return null;
  if (d < 1 || d > daysInMonth(y, m1)) return null;
  return { y, m1, d };
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m1: number): number {
  if (m1 === 2) return isLeapYear(y) ? 29 : 28;
  return m1 === 4 || m1 === 6 || m1 === 9 || m1 === 11 ? 30 : 31;
}

/**
 * Day of week, 0 = Sunday. Sakamoto's algorithm — pure integer math.
 *
 * Deliberately NOT `new Date(y, m-1, d).getDay()`: that constructs a local
 * midnight, which in some zones does not exist on DST-transition days.
 */
export function dayOfWeek(y: number, m1: number, d: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m1 < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m1 - 1] + d) % 7;
}

/** Column index in a Monday-first grid, 0..6. */
export function mondayIndex(y: number, m1: number, d: number): number {
  return (dayOfWeek(y, m1, d) + 6) % 7;
}

export function addMonths(y: number, m1: number, n: number): { y: number; m1: number } {
  const total = y * 12 + (m1 - 1) + n;
  return { y: Math.floor(total / 12), m1: (total % 12) + 1 };
}

/** Days since 1970-01-01 for a civil date. Howard Hinnant's days_from_civil. */
function daysFromCivil(y: number, m1: number, d: number): number {
  const yy = m1 <= 2 ? y - 1 : y;
  const era = Math.floor((yy >= 0 ? yy : yy - 399) / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m1 + (m1 > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(z: number): YMD {
  const zz = z + 719468;
  const era = Math.floor((zz >= 0 ? zz : zz - 146096) / 146097);
  const doe = zz - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const yy = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m1 = mp + (mp < 10 ? 3 : -9);
  return { y: m1 <= 2 ? yy + 1 : yy, m1, d };
}

export function addDays(iso: ISODate, n: number): ISODate {
  const p = parseISO(iso);
  if (!p) return iso;
  const c = civilFromDays(daysFromCivil(p.y, p.m1, p.d) + n);
  return isoDate(c.y, c.m1, c.d);
}

/** ISO dates sort lexicographically, so range checks are string compares. */
export function isBetween(iso: ISODate, min: ISODate, max: ISODate): boolean {
  return iso >= min && iso <= max;
}

/** "YYYY-MM" — the key used for a month of availability. */
export function monthKey(y: number, m1: number): string {
  return `${y}-${pad2(m1)}`;
}

/* ── The only timezone-aware helpers ─────────────────────────────────────── */

/**
 * Today's civil date in a timezone.
 *
 * NEVER call this during render — /booking is statically prerendered, so a
 * clock read outside useEffect bakes the BUILD date into the shipped HTML and
 * every visitor gets a frozen "today". Read it in an effect.
 *
 * `now` is injectable so the test script can pin an instant.
 */
export function todayInZone(tz: string, now: Date = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  // formatToParts + reassemble, not the en-CA trick — that relies on ICU
  // locale data happening to emit YYYY-MM-DD.
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const STUDIO_TZ = "Europe/Lisbon";

export function todayInLisbon(now: Date = new Date()): ISODate {
  return todayInZone(STUDIO_TZ, now);
}

/**
 * Epoch ms for a wall-clock time in a timezone.
 *
 * Two-pass solve: guess the instant as if the wall clock were UTC, ask Intl
 * what that instant looks like in `tz`, and correct by the difference. Exact
 * except inside a DST-repeated hour (01:00–02:00 in Lisbon), which no booking
 * slot goes near.
 */
export function zonedInstant(date: ISODate, hhmm: string, tz: string = STUDIO_TZ): number {
  const p = parseISO(date);
  const t = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!p || !t) return NaN;
  const wall = Date.UTC(p.y, p.m1 - 1, p.d, Number(t[1]), Number(t[2]));

  const offsetAt = (instant: number) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(instant));
    const g = (k: string) => Number(parts.find((x) => x.type === k)?.value);
    // `hour` can come back as 24 for midnight in some ICU versions.
    const hour = g("hour") % 24;
    const asUTC = Date.UTC(g("year"), g("month") - 1, g("day"), hour, g("minute"), g("second"));
    return asUTC - instant;
  };

  let guess = wall - offsetAt(wall);
  guess = wall - offsetAt(guess);
  return guess;
}

/** "Sun 8 Nov 2026" — for emails and calendar descriptions. */
export function formatDateHuman(iso: ISODate, tz: string = STUDIO_TZ): string {
  const p = parseISO(iso);
  if (!p) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(p.y, p.m1 - 1, p.d, 12)));
}
