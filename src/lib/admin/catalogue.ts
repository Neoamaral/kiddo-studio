/**
 * The catalogue as the admin panel sees it: read from the store, written back
 * only after it passes the same rules the build enforces.
 */

import { EQUIPMENT_BUNDLES } from "@/data/equipment";
import type { EquipmentSource, EquipmentSourceRow } from "@/data/types";
import { countPhotos, validateCatalogue } from "@/lib/equipment-validate";
import { purgeCatalogue } from "@/lib/data-source";
import { isConfigured, readEquipment, writeEquipment } from "./store";

export interface LoadedCatalogue {
  data: EquipmentSource;
  /** Send this back on save. Empty while the seed is in use. */
  version: string;
  /** Nothing has been saved yet — the site is serving what shipped with it. */
  seeded: boolean;
  /** No store connected: the panel renders but cannot save. */
  readOnly: boolean;
}

export async function loadCatalogue(): Promise<LoadedCatalogue> {
  const { data, version, seeded } = await readEquipment();
  return { data, version, seeded, readOnly: !isConfigured() };
}

export class SaveRejected extends Error {
  constructor(readonly errors: string[]) {
    super(errors[0] ?? "Invalid");
  }
}

/**
 * Keeps _meta honest about what the rows actually contain.
 *
 * Derived rather than trusted: the validator compares these counts against the
 * rows and rejects a mismatch, so a panel that sent its own numbers would only
 * be inventing a way to fail.
 */
function stamp(rows: EquipmentSourceRow[], previous: EquipmentSource): EquipmentSource {
  const data: EquipmentSource = {
    _meta: {
      ...previous._meta,
      source: "Written by the Kiddo admin panel",
      syncedAt: new Date().toISOString(),
      rowCount: rows.length,
      photoCount: 0,
    },
    rows,
  };
  data._meta.photoCount = countPhotos(data);
  return data;
}

/**
 * Validate, then write, then purge. Never a different order — nothing
 * downstream would catch a bad row, and a save nobody can see is not a save.
 */
export async function saveCatalogue(opts: {
  rows: EquipmentSourceRow[];
  previous: EquipmentSource;
  version: string;
}): Promise<{ version: string }> {
  const next = stamp(opts.rows, opts.previous);

  const { errors } = validateCatalogue(next, EQUIPMENT_BUNDLES);
  if (errors.length) throw new SaveRejected(errors);

  const version = await writeEquipment(next, opts.version);
  purgeCatalogue();
  return { version };
}
