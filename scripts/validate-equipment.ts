/**
 * Validates src/data/equipment.source.json.
 *
 *   npm run validate:equipment
 *
 * Runs as part of `npm run build`, so a bad catalogue fails the deployment
 * instead of reaching production. That matters now that the admin panel — not
 * only a developer with a text editor — can write this file.
 *
 * The data rules live in src/lib/equipment-validate.ts and are shared with the
 * admin save path, so the panel cannot accept something the build would reject.
 * What stays HERE is only what needs a filesystem: case-exact file existence,
 * byte sizes, and image folders nobody references.
 */

import fs from "node:fs";
import path from "node:path";
import source from "../src/data/equipment.source.json";
import {
  EQUIPMENT_BUNDLES,
  MAPPED_CATEGORIES,
  deriveCatalogue,
} from "../src/data/equipment";
import { validateCatalogue } from "../src/lib/equipment-validate";
import type { EquipmentSource } from "../src/data/types";

const data = source as EquipmentSource;

// This script validates the file in the repository — the seed. What the admin
// panel saves is validated on its own way in, by the same rules.
const EQUIPMENT_CATALOGUE = deriveCatalogue(data.rows).categories;

const { errors, warnings } = validateCatalogue(data, EQUIPMENT_BUNDLES);

/* ── Filesystem checks — terminal and CI only ────────────────────────────── */

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
  for (const segment of segments) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return false;
    }
    if (!entries.includes(segment)) return false;
    dir = path.join(dir, segment);
  }
  return true;
}

for (const [i, row] of data.rows.entries()) {
  const where = `row ${i} (${row.code || "no code"})`;
  for (const [j, p] of (row.photos ?? []).entries()) {
    photoTotal++;
    const at = `${where} photo ${j}`;

    // Shape was already judged by validateCatalogue; only look on disk for the
    // paths it considered well-formed.
    if (!p.src.startsWith("/images/equipment/") || p.src.includes("..")) continue;
    if (p.src !== p.src.toLowerCase()) continue;

    referencedDirs.add(`/images/equipment/${(row.code || "").toLowerCase()}/`);

    if (!existsCaseExact(p.src)) {
      errors.push(
        `${at}: file not found at public${p.src} (checked case-exactly — a folder ` +
          `differing only in case would 404 on Vercel)`
      );
      continue;
    }
    const bytes = fs.statSync(path.join(PUBLIC, p.src)).size;
    if (bytes === 0) errors.push(`${at}: file is empty (failed upload?)`);
    else if (bytes > 400_000) {
      warnings.push(`${at}: ${Math.round(bytes / 1024)}KB — re-export smaller`);
    }
  }
}

// Image folders nobody references — dead weight after a deletion.
const eqDir = path.join(PUBLIC, "images", "equipment");
if (fs.existsSync(eqDir)) {
  for (const d of fs.readdirSync(eqDir, { withFileTypes: true })) {
    if (d.isDirectory() && !referencedDirs.has(`/images/equipment/${d.name}/`)) {
      warnings.push(`public/images/equipment/${d.name}/ is referenced by no row — delete it`);
    }
  }
}

/* ── Derived-catalogue checks ────────────────────────────────────────────── */

for (const cat of EQUIPMENT_CATALOGUE) {
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

const catCodes = new Set<string>();
for (const cat of EQUIPMENT_CATALOGUE) {
  if (catCodes.has(cat.code)) {
    errors.push(`duplicate category code "${cat.code}" (${cat.cat})`);
  }
  catCodes.add(cat.code);
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
