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

/** Where the admin panel stores photos. */
const PHOTO_PREFIX = "equipment";

/**
 * A photo in the studio's own Vercel Blob store.
 *
 * Deliberately narrow: any other host is refused. Photos used to be committed
 * files, and a few seeded ones may still be — both shapes are accepted, and
 * nothing else is.
 */
const BLOB_PHOTO =
  /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[a-z0-9-]+\/[a-z0-9-]+\/\d{2}(-[a-z0-9]+)?\.(jpg|png|webp)$/;

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

    if (BLOB_PHOTO.test(p.src)) {
      // Our own storage. The rule that used to reject every http(s) URL was
      // about links that EXPIRE — a Notion file URL dies in about an hour.
      // These do not, and they are the only place photos live now.
      const expectedBlobDir = `/${PHOTO_PREFIX}/${(row.code || "").toLowerCase()}/`;
      if (!p.src.includes(expectedBlobDir)) {
        out.errors.push(`${at}: wrong folder; expected ${expectedBlobDir}`);
      }
    } else if (/^https?:/i.test(p.src)) {
      out.errors.push(
        `${at}: "${p.src}" is not in the studio's own storage — a link somewhere ` +
          `else can expire or change without notice`
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
 * BUNDLES COME OUT OF `data`, NOT A SECOND ARGUMENT.
 *
 * They used to be passed in, because they lived in code and only the rows were
 * proposed. Now both are proposed together, and a second argument would be a
 * trap: the caller would naturally pass the LIVE bundles, so this would check
 * the proposed rows against the stored bundles while the proposed ones were
 * written — validating one document and saving another. No test would catch
 * it, because the two usually agree.
 */
export function validateCatalogue(data: EquipmentSource): ValidationResult {
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

  checkBundles(data, out);

  return out;
}

/**
 * The quick bundles.
 *
 * A bundle that names gear the catalogue no longer has is the worst failure
 * here, because it is silent: bundleAmount() returns null, the code goes into
 * unknownIds, and the booking is REJECTED. Nobody finds out until a client
 * tries to book.
 *
 * The rest of these rules did not exist while bundles were a code constant —
 * a typo was a pull request, not a save. They matter now.
 */
function checkBundles(data: EquipmentSource, out: ValidationResult): void {
  const bundles = data.bundles;
  if (bundles === undefined) return; // a document written before bundles moved
  if (!Array.isArray(bundles)) {
    out.errors.push("catalogue: bundles is not an array");
    return;
  }

  const byCode = new Map(data.rows.map((r) => [r.code, r]));
  const seenIds = new Set<string>();

  for (const b of bundles) {
    const where = `Bundle "${b?.label || b?.id || "?"}"`;

    if (!b || typeof b !== "object") {
      out.errors.push("catalogue: a bundle is missing or malformed");
      continue;
    }

    if (!b.id) out.errors.push(`${where}: missing id`);
    else if (!/^[a-z0-9-]+$/.test(b.id)) {
      out.errors.push(
        `${where}: the id "${b.id}" may only contain lowercase letters, numbers and dashes`
      );
    } else if (seenIds.has(b.id)) {
      /*
       * Not cosmetic. The lookup is `bundles.find(b => b.id === id)`, so the
       * second one is unreachable and permanently unsellable, with no symptom
       * anywhere.
       */
      out.errors.push(`${where}: duplicate id "${b.id}"`);
    } else seenIds.add(b.id);

    if (!b.label?.trim()) out.errors.push(`${where}: needs a label`);

    if (!Array.isArray(b.memberCodes) || b.memberCodes.length === 0) {
      /*
       * Also not cosmetic: bundleAmount on an empty unpriced bundle sums to 0
       * and returns 0, not null — a free line on an invoice.
       */
      out.errors.push(`${where}: sells nothing — add at least one item`);
    } else {
      const seenCodes = new Set<string>();
      for (const code of b.memberCodes) {
        if (seenCodes.has(code)) out.errors.push(`${where}: lists ${code} twice`);
        seenCodes.add(code);

        const item = byCode.get(code);
        if (!item) {
          out.errors.push(
            `${where}: sells ${code}, which is not in the catalogue — ` +
              `remove it from the bundle, or keep the item`
          );
          continue;
        }
        if (item.inStock === 0) {
          out.warnings.push(`${where}: sells ${code}, which has no units in stock`);
        }
        if (!b.rate && item.rate?.kind === "onRequest") {
          out.errors.push(
            `${where}: has no price of its own and ${code} is priced on request, ` +
              `so the bundle cannot be priced at all — give the bundle a fixed price`
          );
        }
      }
    }

    if (b.rate) {
      checkRate(b.rate, where, out);

      // A bundle dearer than its parts is legal and almost certainly a mistake.
      if (b.rate.kind === "fixed" && Number.isFinite(b.rate.amount)) {
        let sum = 0;
        let priceable = true;
        for (const code of b.memberCodes ?? []) {
          const r = byCode.get(code)?.rate;
          if (!r || r.kind === "onRequest") { priceable = false; break; }
          sum += r.kind === "free" ? 0 : r.amount;
        }
        if (priceable && b.rate.amount > sum) {
          out.warnings.push(
            `${where}: costs ${b.rate.amount}€ but its items come to ${sum}€ ` +
              `individually — the bundle is dearer than buying the parts`
          );
        }
      }
    }
  }

  if (data._meta?.bundleCount !== undefined && data._meta.bundleCount !== bundles.length) {
    out.errors.push(
      `_meta.bundleCount is ${data._meta.bundleCount} but there are ${bundles.length} bundles`
    );
  }
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
