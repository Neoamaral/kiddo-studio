/**
 * The catalogue as the admin panel sees it: read from the store, written back
 * only after it passes the same rules the build enforces.
 */

import type { EquipmentBundle, EquipmentSource, EquipmentSourceRow } from "@/data/types";
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
function stamp(
  rows: EquipmentSourceRow[],
  bundles: EquipmentBundle[],
  previous: EquipmentSource
): EquipmentSource {
  /*
   * `bundles` is a REQUIRED positional argument, and this builds a fresh
   * literal rather than spreading `previous`.
   *
   * Both of those are deliberate. This function used to build { _meta, rows },
   * so a bundles key on the previous document was silently dropped — the first
   * edit to any item would have wiped every bundle the studio had, with a green
   * "Saved. The change is live on the site now." on screen.
   *
   * Spreading `previous` would have been worse, not better: a caller that
   * forgot to thread bundles through would keep the OLD ones and discard the
   * edit, just as silently. A required argument makes the compiler refuse.
   */
  const data: EquipmentSource = {
    _meta: {
      ...previous._meta,
      source: "Written by the Kiddo admin panel",
      syncedAt: new Date().toISOString(),
      rowCount: rows.length,
      photoCount: 0,
      bundleCount: bundles.length,
    },
    rows,
    bundles,
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
  bundles: EquipmentBundle[];
  previous: EquipmentSource;
  version: string;
}): Promise<{ version: string; warnings: string[] }> {
  const next = stamp(opts.rows, opts.bundles, opts.previous);

  // Validated on exactly the bytes that will be written — bundles included,
  // which is why validateCatalogue no longer takes them separately.
  const { errors, warnings } = validateCatalogue(next);
  if (errors.length) throw new SaveRejected(errors);

  const version = await writeEquipment(next, opts.version);
  purgeCatalogue();
  // Warnings were computed and thrown away before. Nothing read them but the
  // build script, against the seed — so a rule written as a warning had no
  // reader at all. They go back with the response now.
  return { version, warnings };
}
