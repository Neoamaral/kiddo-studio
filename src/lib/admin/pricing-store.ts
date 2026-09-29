/** The rate card as the admin panel sees it. Same shape as catalogue.ts. */

import type { PricingSource } from "@/data/types";
import { validatePricing } from "@/lib/pricing-validate";
import { purgePricing } from "@/lib/data-source";
import { isConfigured, readPricing, writePricing } from "./store";
import { SaveRejected } from "./catalogue";

export interface LoadedPricing {
  data: PricingSource;
  version: string;
  seeded: boolean;
  readOnly: boolean;
}

export async function loadPricing(): Promise<LoadedPricing> {
  const { data, version, seeded } = await readPricing();
  return { data, version, seeded, readOnly: !isConfigured() };
}

export async function savePricing(opts: {
  data: PricingSource;
  version: string;
}): Promise<{ version: string }> {
  const next: PricingSource = {
    ...opts.data,
    _meta: {
      source: "Studio rate card. Written by the Kiddo admin panel.",
      updatedAt: new Date().toISOString(),
    },
  };

  const { errors } = validatePricing(next);
  if (errors.length) throw new SaveRejected(errors);

  const version = await writePricing(next, opts.version);
  purgePricing();
  return { version };
}
