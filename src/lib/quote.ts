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
import { rateAmount } from "@/lib/money";

export interface QuoteInput {
  slotId: string | null;
  spaceId: string | null;
  /** Ids of selected add-ons. Unknown ids are reported, not thrown on. */
  addonIds: readonly string[];
}

export interface QuoteLine {
  id: string;
  label: string;
  amount: Euros;
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

  const total =
    base.amount +
    (spaceLine?.amount ?? 0) +
    addons.reduce((sum, a) => sum + a.amount, 0);

  return { base, space: spaceLine, addons, total, unknownIds };
}
