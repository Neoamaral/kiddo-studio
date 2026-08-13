/**
 * Validates src/data/equipment.source.json after a Notion sync.
 *
 *   npx tsx scripts/validate-equipment.ts
 *
 * Catches the failure modes a sync actually produces: duplicate or missing
 * SKUs, malformed rates, a row count that disagrees with _meta, and bundles
 * that reference gear the sync removed.
 */

import source from "../src/data/equipment.source.json";
import { EQUIPMENT_BUNDLES, EQUIPMENT_CATALOGUE, itemByCode } from "../src/data/equipment";
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
}

for (const w of warnings) console.warn(`WARN  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);

if (errors.length) {
  console.error(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log(
  `OK — ${data.rows.length} items, ${EQUIPMENT_CATALOGUE.length} categories, ${EQUIPMENT_BUNDLES.length} bundles${
    warnings.length ? `, ${warnings.length} warning(s)` : ""
  }.`
);
