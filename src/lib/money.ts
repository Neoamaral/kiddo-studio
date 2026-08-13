import type { Euros, Rate, RatePeriod } from "@/data/types";

const PERIOD_SUFFIX: Record<RatePeriod, string> = {
  hour: "/h",
  halfDay: "", // half-day price is quoted bare: "140€"
  day: "/day",
  week: "/week",
  unit: "",
};

/** Site convention: € SUFFIXED, no space, whole integers. -> "140€" */
export function eur(amount: Euros): string {
  return `${Math.round(amount)}€`;
}

/**
 * EXCEPTION: the equipment ledger prefixes the symbol ("€150") and renders the
 * period in a separately styled span. Only EquipmentPageClient may use this —
 * everywhere else on the site the symbol is suffixed. Do not "fix" this.
 */
export function eurPrefix(amount: Euros): string {
  return `€${Math.round(amount)}`;
}

/** "+40€" / "+0€" — booking space chips. */
export function eurSigned(amount: Euros): string {
  return `+${eur(amount)}`;
}

export function periodSuffix(per: RatePeriod): string {
  return PERIOD_SUFFIX[per];
}

export interface FormatRateOptions {
  /** Uppercase the words FROM / FREE / ON REQUEST. Default true. */
  upper?: boolean;
  /** Omit the period suffix (tier cards render the unit in their own span). */
  bare?: boolean;
}

/** "80€" · "180€/day" · "FREE" · "FROM 200€" · "FROM 280€/DAY" */
export function formatRate(rate: Rate, o: FormatRateOptions = {}): string {
  const upper = o.upper !== false;
  switch (rate.kind) {
    case "free":
      return upper ? "FREE" : "Free";
    case "onRequest":
      return upper ? "ON REQUEST" : "On request";
    case "fixed":
    case "from": {
      const body = eur(rate.amount) + (o.bare ? "" : periodSuffix(rate.per));
      if (rate.kind === "fixed") return body;
      return upper ? `FROM ${body.toUpperCase()}` : `From ${body}`;
    }
  }
}

/** Numeric value for math; free = 0, onRequest = null (cannot be summed). */
export function rateAmount(rate: Rate): Euros | null {
  if (rate.kind === "free") return 0;
  if (rate.kind === "onRequest") return null;
  return rate.amount;
}
