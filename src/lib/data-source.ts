/**
 * How every page gets its data.
 *
 * WHY THIS IS A PLAIN VARIABLE AND NOT unstable_cache
 *
 * It was unstable_cache with tags, purged on save — the arrangement
 * the Google availability reader used. It did not work: a price saved in the
 * panel never
 * reached the page. revalidateTag did not release it, revalidatePath did not
 * release it, and neither did the cache's own 60-second TTL. Measured over a
 * hundred seconds with the store holding the new value the whole time and the
 * page still serving the old one.
 *
 * So the caching is ours now, and it is about fifteen lines. It behaves the way
 * it reads: hold a value for a few seconds, drop it when something is saved.
 * Nothing about it can surprise us.
 *
 * The TTL is short because the read is cheap and the point of this panel is
 * that a save shows up at once. Five seconds is the worst case for anyone who
 * lands on an instance that did not serve the save — and serverless means
 * there are several, which is exactly why the purge alone is not enough.
 *
 * SERVER ONLY. Client components receive the result as props; they have no way
 * to read the store, and giving them one would ship a write token to the
 * browser.
 */

import { deriveCatalogue, SEED_CATALOGUE, type CatalogueView } from "@/data/equipment";
import { derivePricing, SEED_PRICING, type PricingView } from "@/data/pricing";
import { deriveContact, SEED_CONTACT, type ContactView } from "@/data/contact";
import { readContact, readEquipment, readPricing } from "@/lib/admin/store";

const TTL_MS = 5_000;

interface Slot<T> {
  value: T | null;
  at: number;
}

const catalogueSlot: Slot<CatalogueView> = { value: null, at: 0 };
const pricingSlot: Slot<PricingView> = { value: null, at: 0 };
const contactSlot: Slot<ContactView> = { value: null, at: 0 };

/** Shared shape: serve a fresh-enough value, otherwise fetch and remember. */
async function cached<T>(slot: Slot<T>, load: () => Promise<T>, fallback: T): Promise<T> {
  if (slot.value && Date.now() - slot.at < TTL_MS) return slot.value;
  try {
    slot.value = await load();
    slot.at = Date.now();
    return slot.value;
  } catch (err) {
    // A store outage should make the site slightly stale, never blank: keep
    // serving the last good value, or what shipped with the site.
    console.error("[DATA] store read failed", err);
    return slot.value ?? fallback;
  }
}

export async function getCatalogue(): Promise<CatalogueView> {
  return cached(
    catalogueSlot,
    async () => deriveCatalogue((await readEquipment()).data.rows),
    SEED_CATALOGUE
  );
}

export async function getPricing(): Promise<PricingView> {
  return cached(
    pricingSlot,
    async () => derivePricing((await readPricing()).data),
    SEED_PRICING
  );
}

export async function getContact(): Promise<ContactView> {
  return cached(
    contactSlot,
    async () => deriveContact((await readContact()).data),
    SEED_CONTACT
  );
}

/**
 * Called straight after a save, in the same process that wrote.
 *
 * Other instances catch up within the TTL. That is the honest guarantee: the
 * editor sees the change at once, everyone else within five seconds.
 */
export function purgeCatalogue(): void {
  catalogueSlot.value = null;
  catalogueSlot.at = 0;
}

export function purgePricing(): void {
  pricingSlot.value = null;
  pricingSlot.at = 0;
}

export function purgeContact(): void {
  contactSlot.value = null;
  contactSlot.at = 0;
}
