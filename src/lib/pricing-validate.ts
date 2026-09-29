/**
 * Rate-card validation.
 *
 * This is where the guard that USED to live in check-quote.ts moved to.
 *
 * That script asserted 180, 110, 260 and 160 as literals transcribed from the
 * studio's sheet, deliberately, so a typo in the data file broke the test. Once
 * the panel can change prices those literals break on every legitimate edit
 * instead — so the test now asserts invariants, and the job of catching a
 * nonsense number happens HERE, on the way in, which is where the risk moved.
 */

import type { PricingSource, Rate } from "@/data/types";
import type { ValidationResult } from "./equipment-validate";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const VALID_PERIODS = ["hour", "halfDay", "day", "week", "unit"];

/** "09:00" -> 540. Only for comparing two times on the same day. */
function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function checkRate(rate: Rate, where: string, out: ValidationResult): void {
  if (!rate || typeof rate !== "object" || !("kind" in rate)) {
    out.errors.push(`${where}: rate is missing or malformed`);
    return;
  }
  if (rate.kind === "free" || rate.kind === "onRequest") return;
  if (rate.kind !== "fixed" && rate.kind !== "from") {
    out.errors.push(`${where}: unknown rate kind`);
    return;
  }
  if (!Number.isFinite(rate.amount) || rate.amount < 0) {
    out.errors.push(`${where}: amount must be zero or more`);
  } else if (!Number.isInteger(rate.amount)) {
    out.errors.push(`${where}: amount must be a whole number of euros`);
  }
  if (!VALID_PERIODS.includes(rate.per)) {
    out.errors.push(`${where}: invalid period "${rate.per}"`);
  }
}

export function validatePricing(data: PricingSource): ValidationResult {
  const out: ValidationResult = { errors: [], warnings: [] };

  if (!data || typeof data !== "object") {
    out.errors.push("pricing: not an object");
    return out;
  }

  /* ── The numbers that reach an invoice ─────────────────────────────────── */

  if (!Number.isFinite(data.vatRate) || data.vatRate < 0 || data.vatRate > 1) {
    out.errors.push("VAT must be a fraction between 0 and 1 (0.23 for Portugal)");
  }
  if (!Number.isFinite(data.weekendMultiplier) || data.weekendMultiplier < 1) {
    out.errors.push("The weekend multiplier must be 1 or more — below 1 is a discount");
  } else if (data.weekendMultiplier > 2) {
    out.warnings.push(
      `A weekend multiplier of ${data.weekendMultiplier} more than doubles the price`
    );
  }

  for (const key of ["standard", "offHours"] as const) {
    const v = data.overtime?.[key];
    if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
      out.errors.push(`Overtime (${key}) must be a whole number of euros per hour`);
    }
  }
  if (
    Number.isFinite(data.overtime?.standard) &&
    Number.isFinite(data.overtime?.offHours) &&
    data.overtime.offHours < data.overtime.standard
  ) {
    out.warnings.push("Off-hours overtime is cheaper than standard overtime — is that right?");
  }

  /* ── Studio hours ──────────────────────────────────────────────────────── */

  const open = data.studioDay?.open ?? "";
  const close = data.studioDay?.close ?? "";
  if (!HHMM.test(open)) out.errors.push(`Opening time "${open}" must look like 09:00`);
  if (!HHMM.test(close)) out.errors.push(`Closing time "${close}" must look like 19:00`);
  if (HHMM.test(open) && HHMM.test(close) && minutes(open) >= minutes(close)) {
    out.errors.push("The studio must open before it closes");
  }

  /* ── Durations ─────────────────────────────────────────────────────────── */

  if (!Array.isArray(data.durations) || data.durations.length === 0) {
    out.errors.push("There must be at least one duration");
  } else {
    for (const d of data.durations) {
      if (!d.id) out.errors.push("A duration has no id");
      if (!d.label?.trim()) out.errors.push(`Duration "${d.id}" needs a label`);
      if (!Number.isFinite(d.hours) || d.hours <= 0) {
        out.errors.push(`Duration "${d.id}" needs a positive number of hours`);
      }
    }
  }

  /* ── Packages ──────────────────────────────────────────────────────────── */

  if (!Array.isArray(data.packages) || data.packages.length === 0) {
    out.errors.push("There must be at least one package");
  } else {
    const seen = new Set<string>();
    for (const p of data.packages) {
      const where = `Package "${p.name || p.id || "?"}"`;
      if (!p.id) out.errors.push(`${where}: missing id`);
      else if (seen.has(p.id)) out.errors.push(`${where}: duplicate id "${p.id}"`);
      else seen.add(p.id);

      if (!p.name?.trim()) out.errors.push(`${where}: needs a name`);

      for (const d of data.durations ?? []) {
        const amount = p.rates?.[d.id];
        if (!Number.isFinite(amount)) {
          out.errors.push(`${where}: missing a price for ${d.label || d.id}`);
        } else if (amount < 0) {
          out.errors.push(`${where}: ${d.label || d.id} cannot be negative`);
        } else if (!Number.isInteger(amount)) {
          out.errors.push(`${where}: ${d.label || d.id} must be a whole number of euros`);
        }
      }

      // Cheaper for longer is almost always a typo, and it would let a client
      // pay less for more studio time.
      const hd = p.rates?.hd;
      const fd = p.rates?.fd;
      if (Number.isFinite(hd) && Number.isFinite(fd) && hd > fd) {
        out.errors.push(
          `${where}: the half day (${hd}€) costs more than the full day (${fd}€)`
        );
      }

      if (p.equipmentListUrl && !/^https:\/\//.test(p.equipmentListUrl)) {
        out.errors.push(`${where}: the equipment list link must start with https://`);
      }
      if (!p.includes?.length) {
        out.warnings.push(`${where}: lists nothing that it includes`);
      }
    }

    if (data.packages.filter((p) => p.featured).length > 1) {
      out.warnings.push("More than one package is marked as featured");
    }
  }

  /* ── Add-ons ───────────────────────────────────────────────────────────── */

  if (Array.isArray(data.addons)) {
    const seen = new Set<string>();
    for (const a of data.addons) {
      const where = `Add-on "${a.label || a.id || "?"}"`;
      if (!a.id) out.errors.push(`${where}: missing id`);
      else if (seen.has(a.id)) out.errors.push(`${where}: duplicate id "${a.id}"`);
      else seen.add(a.id);
      if (!a.label?.trim()) out.errors.push(`${where}: needs a label`);
      checkRate(a.rate, where, out);
    }
  }

  return out;
}
