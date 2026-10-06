import "server-only";

/**
 * Loading and saving the integrations, between the admin route and the row.
 *
 * Mirrors src/lib/admin/contact-store.ts: a `load` that reports readOnly, a
 * `save` that rebuilds the record field by field rather than trusting the
 * client's object, validation that throws SaveRejected, and updatedAt as the
 * optimistic-concurrency version.
 *
 * The one thing it does that contact-store does not: it keeps the token out of
 * everything it returns. `loadIntegrations` reports a TokenState, never a
 * token. Only `getCapiToken` opens one, and it is the only export here that
 * can produce a readable credential.
 */

import { isDbConfigured } from "@/lib/db/client";
import { readRow, updateRow } from "@/lib/db/integrations";
import { SaveRejected } from "@/lib/admin/catalogue";
import {
  currentKeyId,
  hasSettingsKey,
  open,
  recordKeyId,
  seal,
  SecretUnreadable,
} from "@/lib/crypto/secretbox";
import type { IntegrationsPatch, IntegrationsView, PublicTagIds, TokenState } from "./types";
import { NO_TAGS } from "./types";

/** Binds the sealed token to this field. See secretbox.ts on AAD. */
export const TOKEN_AAD = "kiddo:integrations:meta_capi_token";

/* ── Validation ──────────────────────────────────────────────────────────── */

/**
 * The same rules the database enforces, repeated here so the studio gets a
 * sentence instead of a constraint-violation error.
 *
 * The database keeps its copy: this one is for the human, that one is the one
 * that cannot be bypassed.
 */
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

/* ── Reading ─────────────────────────────────────────────────────────────── */

function describeToken(sealed: string | null): TokenState {
  if (!sealed) return { kind: "absent" };
  if (!hasSettingsKey()) return { kind: "no-key" };

  const id = recordKeyId(sealed);
  if (!id) return { kind: "unreadable", reason: "malformed", keyId: null };
  if (id !== currentKeyId()) return { kind: "unreadable", reason: "key-changed", keyId: id };

  /*
   * Opened and thrown away. The panel is told "it works", never what it says.
   * Doing this on every load is what makes a tampered record visible on the
   * screen instead of at the moment a booking tries to use it.
   */
  try {
    open(sealed, TOKEN_AAD);
    return { kind: "ok", keyId: id };
  } catch (err) {
    const reason = err instanceof SecretUnreadable ? err.reason : "malformed";
    return { kind: "unreadable", reason, keyId: id };
  }
}

export interface LoadedIntegrations {
  data: IntegrationsView;
  readOnly: boolean;
}

const EMPTY: IntegrationsView = {
  metaPixelId: "",
  metaTestEventCode: "",
  metaEnabled: false,
  googleTagId: "",
  googleEnabled: false,
  token: { kind: "absent" },
  updatedAt: "",
  updatedBy: null,
};

export async function loadIntegrations(): Promise<LoadedIntegrations> {
  if (!isDbConfigured()) return { data: EMPTY, readOnly: true };
  const row = await readRow();
  if (!row) return { data: EMPTY, readOnly: true };

  return {
    readOnly: false,
    data: {
      metaPixelId: row.metaPixelId ?? "",
      metaTestEventCode: row.metaTestEventCode ?? "",
      metaEnabled: row.metaEnabled,
      googleTagId: row.googleTagId ?? "",
      googleEnabled: row.googleEnabled,
      token: describeToken(row.metaCapiToken),
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    },
  };
}

/* ── Writing ─────────────────────────────────────────────────────────────── */

export class VersionConflict extends Error {
  readonly status = 409;
  constructor() {
    super("Someone else saved while you were editing. Reload the page and redo your change.");
  }
}

export async function saveIntegrations(
  patch: IntegrationsPatch,
  opts: { expectedUpdatedAt: string; by: string }
): Promise<{ updatedAt: string }> {
  const errors = validateIntegrations(patch);
  if (errors.length) throw new SaveRejected(errors);

  const blank = (v: string) => (v.trim() ? v.trim() : null);

  /*
   * Tri-state, and the middle case is the one worth naming: an empty string is
   * an instruction to DELETE the token, not an instruction to ignore the
   * field. `undefined` is "the studio did not touch it".
   */
  let token: string | null | undefined;
  if (patch.metaCapiToken !== undefined) {
    const raw = patch.metaCapiToken.trim();
    token = raw ? seal(raw, TOKEN_AAD) : null;
  }

  const updatedAt = await updateRow(
    {
      metaPixelId: blank(patch.metaPixelId),
      metaTestEventCode: blank(patch.metaTestEventCode),
      metaEnabled: patch.metaEnabled,
      googleTagId: blank(patch.googleTagId),
      googleEnabled: patch.googleEnabled,
    },
    { token, expectedUpdatedAt: opts.expectedUpdatedAt, by: opts.by }
  );

  if (!updatedAt) throw new VersionConflict();
  return { updatedAt };
}

/* ── The one function that produces a readable token ─────────────────────── */

/**
 * For the Conversions API call and the connection test, and nothing else.
 *
 * Returns null on every failure — missing key, rotated key, tampered record,
 * no database — so a caller can only ever send a real token or send nothing.
 * It can never send an empty or half-formed one.
 */
export async function getCapiToken(): Promise<string | null> {
  if (!isDbConfigured()) return null;
  const row = await readRow().catch(() => null);
  if (!row?.metaCapiToken) return null;
  try {
    return open(row.metaCapiToken, TOKEN_AAD);
  } catch (err) {
    console.error("[INTEGRATIONS] the stored Conversions API token could not be read", err);
    return null;
  }
}

/** What the public site is allowed to know. Ids only, and only when switched on. */
export async function readPublicTagIds(): Promise<PublicTagIds> {
  if (!isDbConfigured()) return NO_TAGS;
  const row = await readRow().catch(() => null);
  if (!row) return NO_TAGS;
  return {
    metaPixelId: row.metaEnabled ? row.metaPixelId : null,
    googleTagId: row.googleEnabled ? row.googleTagId : null,
  };
}
