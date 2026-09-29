/**
 * The rate card as the admin panel sees it. Same shape as catalogue.ts: read
 * from the repository, write back only after the rules pass.
 */

import bundled from "@/data/pricing.source.json";
import type { PricingSource } from "@/data/types";
import { validatePricing } from "@/lib/pricing-validate";
import { GitHubError, isConfigured, readJson, writeFile } from "./github";
import { SaveRejected } from "./catalogue";

export const PRICING_PATH = "src/data/pricing.source.json";

export interface LoadedPricing {
  data: PricingSource;
  sha: string | null;
  readOnly: boolean;
}

export async function loadPricing(): Promise<LoadedPricing> {
  if (!isConfigured()) {
    return { data: bundled as unknown as PricingSource, sha: null, readOnly: true };
  }
  const file = await readJson<PricingSource>(PRICING_PATH);
  if (!file) throw new GitHubError(`${PRICING_PATH} is missing from the repository`, 404);
  return { data: file.data, sha: file.sha, readOnly: false };
}

export async function savePricing(opts: {
  data: PricingSource;
  sha: string;
  message: string;
}): Promise<{ commit: string }> {
  const next: PricingSource = {
    ...opts.data,
    _meta: {
      source: "Studio rate card. Written by the Kiddo admin panel.",
      updatedAt: new Date().toISOString(),
    },
  };

  const { errors } = validatePricing(next);
  if (errors.length) throw new SaveRejected(errors);

  const result = await writeFile({
    path: PRICING_PATH,
    content: JSON.stringify(next, null, 2) + "\n",
    message: opts.message,
    sha: opts.sha,
  });
  return { commit: result.commit };
}
