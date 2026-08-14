/**
 * Validates src/data/equipment.source.json after a Notion sync.
 *
 *   npx tsx scripts/validate-equipment.ts
 *
 * Catches the failure modes a sync actually produces: duplicate or missing
 * SKUs, malformed rates, a row count that disagrees with _meta, and bundles
 * that reference gear the sync removed.
 */

import fs from "node:fs";
import path from "node:path";
import source from "../src/data/equipment.source.json";
import {
  EQUIPMENT_BUNDLES,
  EQUIPMENT_CATALOGUE,
  MAPPED_CATEGORIES,
  itemByCode,
} from "../src/data/equipment";
import type { EquipmentSource, Rate } from "../src/data/types";

const data = source as EquipmentSource;
const errors: string[] = [];
const warnings: string[] = [];

const VALID_PERIODS = ["hour", "halfDay", "day", "week", "unit"];

function checkRate(rate: Rate, where: string) {
  if (!rate || typeof rate !== "object" || !("kind" in rate)) {
    errors.push(`${where}: rate is missing or malformed`);
    return;
  }
  if (rate.kind === "free" || rate.kind === "onRequest") return;
  if (rate.kind !== "fixed" && rate.kind !== "from") {
    errors.push(`${where}: unknown rate kind "${(rate as { kind: string }).kind}"`);
    return;
  }
  if (typeof rate.amount !== "number" || !Number.isFinite(rate.amount)) {
    errors.push(`${where}: rate.amount is not a finite number`);
  } else if (rate.amount < 0) {
    errors.push(`${where}: negative rate ${rate.amount}`);
  } else if (!Number.isInteger(rate.amount)) {
    warnings.push(`${where}: non-integer amount ${rate.amount} (site renders whole euros)`);
  }
  if (!VALID_PERIODS.includes(rate.per)) {
    errors.push(`${where}: invalid period "${rate.per}"`);
  }
}

// Rows
const seenCodes = new Set<string>();
for (const [i, row] of data.rows.entries()) {
  const where = `row ${i} (${row.code || "no code"})`;
  if (!row.code?.trim()) errors.push(`${where}: missing code`);
  else if (seenCodes.has(row.code)) errors.push(`${where}: duplicate code`);
  else seenCodes.add(row.code);

  if (!row.name?.trim()) errors.push(`${where}: missing name`);
  if (!row.category?.trim()) errors.push(`${where}: missing category`);
  if (typeof row.inStock !== "number" || row.inStock < 0) {
    errors.push(`${where}: inStock must be a non-negative number`);
  }
  checkRate(row.rate, where);
}

/* ── Photos ──────────────────────────────────────────────────────────────── */

const PUBLIC = path.join(process.cwd(), "public");
const referencedDirs = new Set<string>();
let photoTotal = 0;

/**
 * Case-EXACT existence check.
 *
 * fs.existsSync is case-insensitive on Windows: it returns true for
 * public/images/equipment/CAM-01/01.jpg when the disk actually holds cam-01/.
 * That is precisely the bug this validator exists to catch — it would pass on
 * the dev machine and 404 on Vercel's case-sensitive Linux filesystem. Walking
 * the directory entries and comparing exact strings works on every platform.
 */
function existsCaseExact(relFromPublic: string): boolean {
  const segments = relFromPublic.split("/").filter(Boolean);
  let dir = PUBLIC;
  for (let i = 0; i < segments.length; i++) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return false;
    }
    if (!entries.includes(segments[i])) return false;
    dir = path.join(dir, segments[i]);
  }
  return true;
}

for (const [i, row] of data.rows.entries()) {
  const where = `row ${i} (${row.code || "no code"})`;
  const photos = row.photos ?? [];
  photoTotal += photos.length;
  const expectedDir = `/images/equipment/${(row.code || "").toLowerCase()}/`;
  const seenSrc = new Set<string>();

  if (photos.length > 8) {
    warnings.push(`${where}: ${photos.length} photos — the gallery is designed for <= 6`);
  }

  for (const [j, p] of photos.entries()) {
    const at = `${where} photo ${j}`;

    if (/^https?:/i.test(p.src)) {
      errors.push(`${at}: remote URL "${p.src}" — Notion links expire in ~1h; download the file`);
    } else if (!p.src.startsWith("/images/equipment/") || p.src.includes("..")) {
      errors.push(`${at}: src must live under /images/equipment/`);
    } else if (p.src !== p.src.toLowerCase()) {
      errors.push(`${at}: src must be lowercase — Vercel's filesystem is case-sensitive`);
    } else if (!p.src.startsWith(expectedDir)) {
      errors.push(`${at}: wrong folder; expected ${expectedDir}`);
    } else {
      referencedDirs.add(expectedDir);
      const abs = path.join(PUBLIC, p.src);
      if (!existsCaseExact(p.src)) {
        errors.push(
          `${at}: file not found at public${p.src} (checked case-exactly — a folder ` +
            `differing only in case would 404 on Vercel)`
        );
      } else {
        const bytes = fs.statSync(abs).size;
        if (bytes === 0) errors.push(`${at}: file is empty (failed download?)`);
        else if (bytes > 400_000) {
          warnings.push(`${at}: ${Math.round(bytes / 1024)}KB — re-export smaller`);
        }
      }
    }

    if (!p.alt?.trim()) {
      errors.push(`${at}: alt text is required and must be non-empty`);
    } else if (p.alt.trim() === row.name && photos.length > 1) {
      warnings.push(`${at}: alt just repeats the item name — describe what this shot shows`);
    }

    if (seenSrc.has(p.src)) errors.push(`${at}: duplicate src within the item`);
    seenSrc.add(p.src);
  }

  if (row.description && row.description.length > 700) {
    warnings.push(`${where}: description is ${row.description.length} chars — the panel is sized for ~400`);
  }
}

// Image folders nobody references — dead weight after a Notion deletion.
const eqDir = path.join(PUBLIC, "images", "equipment");
if (fs.existsSync(eqDir)) {
  for (const d of fs.readdirSync(eqDir, { withFileTypes: true })) {
    if (d.isDirectory() && !referencedDirs.has(`/images/equipment/${d.name}/`)) {
      warnings.push(`public/images/equipment/${d.name}/ is referenced by no row — delete it`);
    }
  }
}

if (data._meta.photoCount !== undefined && data._meta.photoCount !== photoTotal) {
  errors.push(`_meta.photoCount is ${data._meta.photoCount} but there are ${photoTotal} photos`);
}

// Meta
if (data._meta.rowCount !== data.rows.length) {
  errors.push(
    `_meta.rowCount is ${data._meta.rowCount} but there are ${data.rows.length} rows`
  );
}
if (!data._meta.syncedAt) {
  warnings.push("_meta.syncedAt is empty — this data has not been synced from Notion yet");
}

// Bundles must resolve against the catalogue
for (const bundle of EQUIPMENT_BUNDLES) {
  for (const code of bundle.memberCodes) {
    if (!itemByCode(code)) {
      errors.push(
        `bundle "${bundle.id}" references ${code}, which is not in the catalogue`
      );
    }
  }
}

// Category codes must stay unique — the filter tabs key off them
const catCodes = new Set<string>();
for (const cat of EQUIPMENT_CATALOGUE) {
  if (catCodes.has(cat.code)) {
    errors.push(`duplicate category code "${cat.code}" (${cat.cat})`);
  }
  catCodes.add(cat.code);

  // A category with no CATEGORY_META entry still renders — buildCatalogue has a
  // deterministic fallback — but it ships a generic hero label and a filter tab
  // derived from a blind 3-letter slice. Silent until someone looks at the page.
  if (!MAPPED_CATEGORIES.has(cat.cat)) {
    warnings.push(
      `category "${cat.cat}" has no CATEGORY_META entry — using the fallback ` +
        `(code "${cat.code}", label "${cat.shortLabel}", "N ${cat.unitNoun}"). ` +
        `Add one in src/data/equipment.ts.`
    );
  }
}

for (const w of warnings) console.warn(`WARN  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);

if (errors.length) {
  console.error(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log(
  `OK — ${data.rows.length} items, ${EQUIPMENT_CATALOGUE.length} categories, ` +
    `${EQUIPMENT_BUNDLES.length} bundles, ${photoTotal} photos${
      warnings.length ? `, ${warnings.length} warning(s)` : ""
    }.`
);
