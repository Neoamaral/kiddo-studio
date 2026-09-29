/**
 * Catalogue validation rules — the pure half.
 *
 * These used to live inside scripts/validate-equipment.ts, which could only
 * ever run at the terminal: it imported the JSON at module load, accumulated
 * into module-level arrays and ended in process.exit(). None of that can be
 * called from an API route.
 *
 * Now that the admin panel writes the catalogue, the SAME rules have to run
 * before a save — nothing downstream would catch a bad row otherwise. So the
 * rules take data in and hand results back, and the script keeps only what
 * genuinely needs a filesystem (case-exact file existence, byte sizes, orphan
 * folders), which is meaningless in a serverless function anyway.
 */

import type {
  EquipmentBundle,
  EquipmentSource,
  EquipmentSourceRow,
  Rate,
} from "@/data/types";

export interface ValidationResult {
  /** Blocks the save. */
  errors: string[];
  /** Worth knowing, does not block. */
  warnings: string[];
}

const VALID_PERIODS = ["hour", "halfDay", "day", "week", "unit"];

/** The gallery is designed for six; more still renders. */
const PHOTO_SOFT_MAX = 6;

function checkRate(rate: Rate, where: string, out: ValidationResult): void {
  if (!rate || typeof rate !== "object" || !("kind" in rate)) {
    out.errors.push(`${where}: rate is missing or malformed`);
    return;
  }
  if (rate.kind === "free" || rate.kind === "onRequest") return;
  if (rate.kind !== "fixed" && rate.kind !== "from") {
    out.errors.push(`${where}: unknown rate kind "${(rate as { kind: string }).kind}"`);
    return;
  }
  if (typeof rate.amount !== "number" || !Number.isFinite(rate.amount)) {
    out.errors.push(`${where}: rate.amount is not a finite number`);
  } else if (rate.amount < 0) {
    out.errors.push(`${where}: negative rate ${rate.amount}`);
  } else if (!Number.isInteger(rate.amount)) {
    out.warnings.push(
      `${where}: non-integer amount ${rate.amount} (the site renders whole euros)`
    );
  }
  if (!VALID_PERIODS.includes(rate.per)) {
    out.errors.push(`${where}: invalid period "${rate.per}"`);
  }
}

function checkRow(row: EquipmentSourceRow, i: number, seen: Set<string>, out: ValidationResult): void {
  const where = `row ${i} (${row.code || "no code"})`;

  if (!row.code?.trim()) out.errors.push(`${where}: missing code`);
  else if (seen.has(row.code)) out.errors.push(`${where}: duplicate code`);
  else seen.add(row.code);

  if (!row.name?.trim()) out.errors.push(`${where}: missing name`);
  if (!row.category?.trim()) out.errors.push(`${where}: missing category`);
  if (typeof row.inStock !== "number" || !Number.isInteger(row.inStock) || row.inStock < 0) {
    out.errors.push(`${where}: inStock must be a non-negative whole number`);
  }
  checkRate(row.rate, where, out);

  if (row.description && row.description.length > 700) {
    out.warnings.push(
      `${where}: description is ${row.description.length} chars — the panel is sized for ~400`
    );
  }
}

function checkPhotos(row: EquipmentSourceRow, i: number, out: ValidationResult): number {
  const where = `row ${i} (${row.code || "no code"})`;
  const photos = row.photos ?? [];
  const expectedDir = `/images/equipment/${(row.code || "").toLowerCase()}/`;
  const seenSrc = new Set<string>();

  if (photos.length > PHOTO_SOFT_MAX) {
    out.warnings.push(
      `${where}: ${photos.length} photos — the gallery is designed for <= ${PHOTO_SOFT_MAX}`
    );
  }

  for (const [j, p] of photos.entries()) {
    const at = `${where} photo ${j}`;

    if (/^https?:/i.test(p.src)) {
      out.errors.push(
        `${at}: remote URL "${p.src}" — signed links expire; the file must be committed`
      );
    } else if (!p.src.startsWith("/images/equipment/") || p.src.includes("..")) {
      out.errors.push(`${at}: src must live under /images/equipment/`);
    } else if (p.src !== p.src.toLowerCase()) {
      out.errors.push(`${at}: src must be lowercase — Vercel's filesystem is case-sensitive`);
    } else if (!p.src.startsWith(expectedDir)) {
      out.errors.push(`${at}: wrong folder; expected ${expectedDir}`);
    }

    if (!p.alt?.trim()) {
      out.errors.push(`${at}: alt text is required and must be non-empty`);
    } else if (p.alt.trim() === row.name && photos.length > 1) {
      out.warnings.push(`${at}: alt just repeats the item name — describe what this shot shows`);
    }

    if (seenSrc.has(p.src)) out.errors.push(`${at}: duplicate src within the item`);
    seenSrc.add(p.src);
  }

  return photos.length;
}

/**
 * Every rule that can be decided from the data alone.
 *
 * `bundles` is passed in rather than imported so the caller can check PROPOSED
 * rows against the live bundles — which is exactly what the admin save path
 * needs before it writes.
 */
export function validateCatalogue(
  data: EquipmentSource,
  bundles: readonly EquipmentBundle[] = []
): ValidationResult {
  const out: ValidationResult = { errors: [], warnings: [] };

  if (!data || !Array.isArray(data.rows)) {
    out.errors.push("catalogue: rows is missing or not an array");
    return out;
  }

  const seenCodes = new Set<string>();
  let photoTotal = 0;
  for (const [i, row] of data.rows.entries()) {
    checkRow(row, i, seenCodes, out);
    photoTotal += checkPhotos(row, i, out);
  }

  if (data._meta) {
    if (data._meta.rowCount !== data.rows.length) {
      out.errors.push(
        `_meta.rowCount is ${data._meta.rowCount} but there are ${data.rows.length} rows`
      );
    }
    if (data._meta.photoCount !== undefined && data._meta.photoCount !== photoTotal) {
      out.errors.push(
        `_meta.photoCount is ${data._meta.photoCount} but there are ${photoTotal} photos`
      );
    }
  }

  /*
   * A bundle that names gear the catalogue no longer has is the worst failure
   * mode here, because it is silent: bundleAmount() returns null, the code goes
   * into unknownIds, and the booking is REJECTED. Nobody finds out until a
   * client tries to book.
   */
  for (const bundle of bundles) {
    for (const code of bundle.memberCodes) {
      if (!data.rows.some((r) => r.code === code)) {
        out.errors.push(
          `bundle "${bundle.id}" references ${code}, which is not in the catalogue`
        );
      }
    }
  }

  return out;
}

/** Codes a bundle depends on — the admin panel refuses to delete these. */
export function codesUsedByBundles(bundles: readonly EquipmentBundle[]): Set<string> {
  const used = new Set<string>();
  for (const b of bundles) for (const c of b.memberCodes) used.add(c);
  return used;
}

/** Total photos across the catalogue, for keeping _meta.photoCount honest. */
export function countPhotos(data: EquipmentSource): number {
  return data.rows.reduce((n, r) => n + (r.photos?.length ?? 0), 0);
}
