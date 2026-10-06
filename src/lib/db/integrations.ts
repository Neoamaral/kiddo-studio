import "server-only";

/**
 * The integrations row.
 *
 * One row, enforced by the database (see db/migrations/002_integrations.sql),
 * so every read here is a bare select with no where clause and no ordering.
 *
 * THE SEALED TOKEN NEVER LEAVES THIS MODULE AS PLAINTEXT. `readRow` returns it
 * still sealed; only `getCapiToken` opens it, and it hands a bare string to
 * exactly one caller. Nothing that the admin route or a page can reach ever
 * holds a readable token.
 */

import { db, isDbConfigured, rows, withTimeout, READ_TIMEOUT_MS, WRITE_TIMEOUT_MS } from "./client";

export interface IntegrationsRow {
  metaPixelId: string | null;
  /** Still sealed. `v1.<keyId>.<base64>` or null. */
  metaCapiToken: string | null;
  metaTestEventCode: string | null;
  metaEnabled: boolean;
  googleTagId: string | null;
  googleEnabled: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export async function readRow(): Promise<IntegrationsRow | null> {
  if (!isDbConfigured()) return null;
  const sql = db();
  const out = await withTimeout(
    rows<IntegrationsRow>(sql`
      select meta_pixel_id         as "metaPixelId",
             meta_capi_token       as "metaCapiToken",
             meta_test_event_code  as "metaTestEventCode",
             meta_enabled          as "metaEnabled",
             google_tag_id         as "googleTagId",
             google_enabled        as "googleEnabled",
             -- ::text, not the default. The driver turns a timestamptz into a
             -- JS Date, which has millisecond precision — Postgres has
             -- microseconds. Round-tripping through a Date would truncate the
             -- version and every save would then look like someone else's
             -- edit. Text keeps all six digits.
             updated_at::text      as "updatedAt",
             updated_by            as "updatedBy"
        from integrations
    `),
    READ_TIMEOUT_MS,
    "read integrations"
  );
  return out[0] ?? null;
}

/**
 * The write.
 *
 * `token` is tri-state, matching IntegrationsPatch: undefined leaves the
 * stored value alone, null clears it, a string replaces it. `coalesce` cannot
 * express that, so the SQL takes a separate boolean saying whether the token
 * is being touched at all — clearer than three code paths.
 *
 * The where clause is the optimistic-concurrency check. No rows updated means
 * someone saved while this screen was open, and the caller turns that into the
 * same 409 the blob documents produce.
 */
export async function updateRow(
  patch: {
    metaPixelId: string | null;
    metaTestEventCode: string | null;
    metaEnabled: boolean;
    googleTagId: string | null;
    googleEnabled: boolean;
  },
  opts: { token?: string | null; expectedUpdatedAt: string; by: string }
): Promise<string | null> {
  const sql = db();
  const touchToken = opts.token !== undefined;
  const out = await withTimeout(
    rows<{ updatedAt: string }>(sql`
      update integrations
         set meta_pixel_id        = ${patch.metaPixelId},
             meta_test_event_code = ${patch.metaTestEventCode},
             meta_enabled         = ${patch.metaEnabled},
             google_tag_id        = ${patch.googleTagId},
             google_enabled       = ${patch.googleEnabled},
             meta_capi_token      = case when ${touchToken}
                                         then ${opts.token ?? null}
                                         else meta_capi_token end,
             -- updated_at is NOT set here: the integrations_touch trigger
             -- from 002 does it, the same way requests and clients work.
             updated_by           = ${opts.by}
       where updated_at = ${opts.expectedUpdatedAt}::timestamptz
      returning updated_at::text as "updatedAt"
    `),
    WRITE_TIMEOUT_MS,
    "update integrations"
  );
  return out[0]?.updatedAt ?? null;
}
