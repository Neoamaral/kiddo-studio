/**
 * Booking price maths — the single source of truth.
 *
 * Pure and React-free so the summary UI and the API route call the exact same
 * function. Previously both re-implemented `slot === "fd" ? 280 : 140` inline
 * and could silently disagree.
 */

import type { Euros } from "@/data/types";
import type { ISODate } from "@/lib/date";
import { ADDON_OPTIONS, slotById } from "@/data/booking";
import {
  DEFAULT_DURATION_ID,
  DEFAULT_PACKAGE_ID,
  PACKAGE_BY_ID,
  packageById,
  packagePrice,
  vatOf,
  withVat,
} from "@/data/pricing";
import { surchargeMultiplier, surchargeReason, type SurchargeReason } from "@/lib/surcharge";
import { spaceById } from "@/data/spaces";
import { EQUIPMENT_BUNDLES, bundleAmount, itemByCode } from "@/data/equipment";
import { rateAmount } from "@/lib/money";

export interface QuoteInput {
  slotId: string | null;
  spaceId: string | null;
  /** Which gear package. Falls back to the cheapest before one is picked. */
  packageId?: string | null;
  /**
   * The booked date, "YYYY-MM-DD". Drives the weekend / public-holiday
   * surcharge. Absent means no surcharge — a quote with no date yet is a
   * weekday quote, which is what the empty summary panel shows.
   */
  date?: ISODate | null;
  /** Ids of selected add-ons. Unknown ids are reported, not thrown on. */
  addonIds: readonly string[];
  /**
   * Equipment code -> quantity. Optional and additive: absent or empty gives
   * exactly the pre-equipment result, which is what keeps check-quote's studio
   * assertions meaningful.
   */
  equipment?: Readonly<Record<string, number>>;
  /**
   * Bundle ids chosen as presets. Priced as the bundle, NOT as the sum of its
   * members — and the members are excluded from the per-item lines so a body
   * inside a bundle is never charged twice.
   */
  bundleIds?: readonly string[];
}

export interface QuoteLine {
  id: string;
  label: string;
  amount: Euros;
}

export interface EquipmentLine extends QuoteLine {
  qty: number;
  /** Per-unit day rate, before qty. */
  unitAmount: Euros;
}

export interface Quote {
  /** Always present — falls back to the cheapest half day before a slot is picked. */
  base: QuoteLine;
  space: QuoteLine | null;
  /**
   * The +20% on studio time, when the date is a weekend or a public holiday.
   * A separate line rather than a bigger `base` so the client can see WHY the
   * price moved — a silently larger number reads as a mistake.
   */
  surcharge: (QuoteLine & { reason: SurchargeReason }) | null;
  addons: readonly QuoteLine[];
  /** One line per gear bundle preset. */
  bundles: readonly QuoteLine[];
  /** One line per individually rented item; qty is folded into the amount. */
  equipment: readonly EquipmentLine[];
  /** Everything above, EXCLUDING VAT. */
  subtotal: Euros;
  /** VAT on the subtotal. */
  vat: Euros;
  /** What the client actually pays: subtotal + vat. */
  total: Euros;
  /** Submitted ids that matched no slot/space/add-on. The API rejects on these. */
  unknownIds: readonly string[];
}

export function computeQuote(input: QuoteInput): Quote {
  const unknownIds: string[] = [];

  const slot = slotById(input.slotId);
  if (input.slotId && !slot) unknownIds.push(input.slotId);

  const space = spaceById(input.spaceId);
  if (input.spaceId && !space) unknownIds.push(input.spaceId);

  const pkg = packageById(input.packageId) ?? PACKAGE_BY_ID[DEFAULT_PACKAGE_ID];
  if (input.packageId && !packageById(input.packageId)) unknownIds.push(input.packageId);

  const durationId = slot?.durationId ?? DEFAULT_DURATION_ID;
  const base: QuoteLine = {
    id: `${pkg.id}-${durationId}`,
    label: `${pkg.name} · ${slot?.label ?? "HALF DAY"}`,
    amount: packagePrice(pkg, durationId),
  };

  const spaceLine: QuoteLine | null =
    space && space.upcharge > 0
      ? { id: space.id, label: space.label, amount: space.upcharge }
      : null;

  const addons: QuoteLine[] = [];
  for (const id of input.addonIds) {
    const addon = ADDON_OPTIONS.find((a) => a.id === id);
    if (!addon) {
      unknownIds.push(id);
      continue;
    }
    addons.push({
      id: addon.id,
      label: addon.label,
      amount: rateAmount(addon.rate) ?? 0,
    });
  }

  /* ── Gear bundles (presets) ─────────────────────────────────────────────
   * Priced as the bundle. Their member codes are collected so the per-item
   * loop below skips them — otherwise "Camera bundle" plus a hand-picked FX6
   * would charge for the body twice.
   */
  const bundles: QuoteLine[] = [];
  const coveredByBundle = new Set<string>();
  for (const id of input.bundleIds ?? []) {
    const bundle = EQUIPMENT_BUNDLES.find((b) => b.id === id);
    if (!bundle) {
      unknownIds.push(id);
      continue;
    }
    const amount = bundleAmount(bundle);
    if (amount === null) {
      // Price on request — never silently priced at zero.
      unknownIds.push(id);
      continue;
    }
    bundles.push({ id: bundle.id, label: bundle.label, amount });
    for (const code of bundle.memberCodes) coveredByBundle.add(code);
  }

  /* ── Individually rented equipment ──────────────────────────────────────
   * Always the FULL day rate, whatever the slot: the item leaves inventory
   * for the whole day either way.
   */
  const equipment: EquipmentLine[] = [];
  for (const [code, rawQty] of Object.entries(input.equipment ?? {})) {
    const qty = Math.floor(rawQty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    if (coveredByBundle.has(code)) continue;

    const item = itemByCode(code);
    if (!item) {
      unknownIds.push(code);
      continue;
    }
    const unitAmount = rateAmount(item.rate);
    if (unitAmount === null) {
      // rate.kind === "onRequest" — quoting it as 0 would be a lie.
      unknownIds.push(code);
      continue;
    }
    // A free item (the C-stand kit) still gets a line: it must appear on the
    // booking even though it costs nothing.
    equipment.push({
      id: item.code,
      label: item.name,
      qty,
      unitAmount,
      amount: unitAmount * qty,
    });
  }

  /* ── Weekend / holiday surcharge ────────────────────────────────────────
   * Applies to STUDIO TIME only — the package and the space upcharge. Not to
   * equipment or services: a lens does not cost the studio more on a Saturday,
   * and a coordinator is quoted as a day rate either way. "All applicable
   * rates" in the rate card is read as "the rates that scale with the day".
   */
  const studioTime = base.amount + (spaceLine?.amount ?? 0);
  const multiplier = surchargeMultiplier(input.date);
  const surchargeAmount = Math.round(studioTime * multiplier) - studioTime;
  const reason = surchargeReason(input.date);
  const surcharge =
    surchargeAmount > 0 && reason
      ? {
          id: "surcharge",
          label: reason === "holiday" ? "Public holiday" : "Weekend",
          amount: surchargeAmount,
          reason,
        }
      : null;

  const subtotal =
    studioTime +
    (surcharge?.amount ?? 0) +
    addons.reduce((sum, a) => sum + a.amount, 0) +
    bundles.reduce((sum, b) => sum + b.amount, 0) +
    equipment.reduce((sum, e) => sum + e.amount, 0);

  return {
    base,
    space: spaceLine,
    surcharge,
    addons,
    bundles,
    equipment,
    subtotal,
    vat: vatOf(subtotal),
    total: withVat(subtotal),
    unknownIds,
  };
}
