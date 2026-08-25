/**
 * Booking price maths — the single source of truth.
 *
 * Pure and React-free so the summary UI and the API route call the exact same
 * function. Previously both re-implemented `slot === "fd" ? 280 : 140` inline
 * and could silently disagree.
 */

import type { Euros, TierId } from "@/data/types";
import { ADDON_OPTIONS, slotById } from "@/data/booking";
import { TIER_BY_ID } from "@/data/pricing";
import { spaceById } from "@/data/spaces";
import { EQUIPMENT_BUNDLES, bundleAmount, itemByCode } from "@/data/equipment";
import { rateAmount } from "@/lib/money";

export interface QuoteInput {
  slotId: string | null;
  spaceId: string | null;
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

/**
 * Tier quoted before a slot is picked. The summary panel has always shown
 * "Base · Half day — 140€" on an empty selection; keeping that explicit here
 * stops it from being re-invented as a ternary somewhere else.
 */
const DEFAULT_TIER_ID: TierId = "hd";

export interface Quote {
  /** Always present — falls back to the half-day tier before a slot is picked. */
  base: QuoteLine;
  space: QuoteLine | null;
  addons: readonly QuoteLine[];
  /** One line per gear bundle preset. */
  bundles: readonly QuoteLine[];
  /** One line per individually rented item; qty is folded into the amount. */
  equipment: readonly EquipmentLine[];
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

  const tier = TIER_BY_ID[slot?.tierId ?? DEFAULT_TIER_ID];
  const base: QuoteLine = {
    id: slot?.id ?? DEFAULT_TIER_ID,
    label: slot?.label ?? tier.name,
    amount: rateAmount(tier.rate) ?? 0,
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

  const total =
    base.amount +
    (spaceLine?.amount ?? 0) +
    addons.reduce((sum, a) => sum + a.amount, 0) +
    bundles.reduce((sum, b) => sum + b.amount, 0) +
    equipment.reduce((sum, e) => sum + e.amount, 0);

  return { base, space: spaceLine, addons, bundles, equipment, total, unknownIds };
}
