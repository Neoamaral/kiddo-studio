/**
 * The rules the connections screen enforces for the human.
 *
 * Pure and WITHOUT `import "server-only"`, next to contact-validate.ts and
 * pricing-validate.ts for the same reason they are: scripts/check-*.ts is how
 * this project tests, and server-only throws inside a plain script.
 *
 * The database carries its own copy of every rule in 002_integrations.sql.
 * That copy is the one that cannot be bypassed; this one exists so the studio
 * reads a sentence instead of a constraint violation.
 */

import { hasSettingsKey } from "@/lib/crypto/secretbox";
import type { IntegrationsPatch } from "./types";

export function validateIntegrations(p: IntegrationsPatch): string[] {
  const out: string[] = [];

  const pixel = p.metaPixelId.trim();
  if (pixel && !/^[0-9]{10,25}$/.test(pixel)) {
    out.push(
      pixel.startsWith("EAA")
        ? "That looks like an access token, not a Pixel ID. The Pixel ID is the long number next to your dataset name in Events Manager."
        : "A Meta Pixel ID is 10 to 25 digits and nothing else — no spaces, no URL."
    );
  }
  if (p.metaEnabled && !pixel) {
    out.push("Meta cannot be switched on without a Pixel ID.");
  }

  const code = p.metaTestEventCode.trim();
  if (code && !/^TEST[0-9]{1,12}$/.test(code)) {
    out.push('A test event code looks like "TEST12345". Copy it from Events Manager > Test events.');
  }

  const tag = p.googleTagId.trim();
  if (tag && !/^(G-[A-Z0-9]{4,20}|AW-[0-9]{6,20})$/.test(tag)) {
    out.push(
      tag.toUpperCase().startsWith("UA-")
        ? "UA- is Universal Analytics, which Google switched off in 2023 and which collects nothing. A GA4 ID looks like G-ABC123XYZ."
        : "A Google tag is either G-ABC123XYZ for Analytics or AW-123456789 for Ads."
    );
  }
  if (p.googleEnabled && !tag) {
    out.push("Google cannot be switched on without a tag ID.");
  }

  if (p.metaCapiToken !== undefined && p.metaCapiToken.trim() && !hasSettingsKey()) {
    out.push(
      "This server has no encryption key, so a token cannot be stored. SETTINGS_KEY needs to be set in the environment — pasting the token again will not help."
    );
  }

  return out;
}

