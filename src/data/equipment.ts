/**
 * Equipment catalogue.
 *
 * SOURCE OF TRUTH: the admin panel, which stores the rows in Vercel Blob.
 * src/data/equipment.source.json is the SEED — what the site serves until the
 * first save, and the fallback if the store cannot be reached.
 *
 * Everything that is a function of the rows (counts, filter tabs, straplines,
 * the hero summary bar) is DERIVED by deriveCatalogue(). It takes rows as an
 * ARGUMENT rather than reading the import, because the rows now arrive at
 * request time — see src/lib/data-source.ts.
 *
 * There are deliberately no module-level `export const` catalogues any more. A
 * component that quietly kept importing one would render the data baked in at
 * build time and never update, which is exactly the bug this shape prevents:
 * without them, the compiler names every place that has to be passed the data.
 */

import type {
  EquipmentBundle,
  EquipmentCategory,
  EquipmentItem,
  EquipmentSource,
  EquipmentPhoto,
  EquipmentSourceRow,
} from "./types";
import source from "./equipment.source.json";
import { rateAmount } from "@/lib/money";

/** Max segments rendered by the stock bars. Counts above this are clamped. */
export const STOCK_BAR_MAX = 8;

/**
 * Presentation metadata per category. Hand-maintained: add an entry when Notion
 * introduces a new category. Unknown categories fall back deterministically
 * rather than crashing, so a sync can never white-screen the page.
 */
const CATEGORY_META: Record<
  string,
  { code: string; shortLabel: string; unitNoun: string }
> = {
  "CAMERA · BODIES": { code: "CAM", shortLabel: "CAMERAS", unitNoun: "bodies" },
  LIGHTING: { code: "LIT", shortLabel: "LIGHTING", unitNoun: "fixtures" },
  LENSES: { code: "LNS", shortLabel: "LENSES", unitNoun: "optics" },
  AUDIO: { code: "AUD", shortLabel: "AUDIO", unitNoun: "mics" },
  "GRIP & SUPPORT": { code: "GRP", shortLabel: "GRIP", unitNoun: "items" },
};

/**
 * Category names that have an explicit CATEGORY_META entry. Anything outside
 * this set renders via the fallback below — which works, but ships a generic
 * hero label. validate-equipment.ts warns on it.
 */
export const MAPPED_CATEGORIES: ReadonlySet<string> = new Set(
  Object.keys(CATEGORY_META)
);

/** "PROP & SET DRESSING" -> "PRO"; de-duplicated with a numeric suffix. */
function fallbackCode(category: string, taken: Set<string>): string {
  const letters = category.replace(/[^A-Za-z]/g, "").toUpperCase();
  const base = (letters.slice(0, 3) || "MSC").padEnd(3, "X");
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n++) {
    const candidate = `${base.slice(0, 2)}${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return base;
}

function toItem(row: EquipmentSourceRow): EquipmentItem {
  return {
    code: row.code,
    name: row.name,
    spec: row.spec,
    rate: row.rate,
    inStock: row.inStock,
    ...(row.hot ? { hot: true } : {}),
    ...(row.photos?.length ? { photos: row.photos } : {}),
    ...(row.description?.trim() ? { description: row.description } : {}),
  };
}

/**
 * Group flat rows into categories, preserving first-appearance order.
 * Flat rows are what make the JSON resilient to whatever shape Notion has.
 */
function buildCatalogue(rows: readonly EquipmentSourceRow[]): EquipmentCategory[] {
  const byCategory = new Map<string, EquipmentItem[]>();
  for (const row of rows) {
    const bucket = byCategory.get(row.category);
    if (bucket) bucket.push(toItem(row));
    else byCategory.set(row.category, [toItem(row)]);
  }

  const takenCodes = new Set<string>();
  return Array.from(byCategory, ([cat, items]) => {
    const meta = CATEGORY_META[cat];
    const code = meta?.code ?? fallbackCode(cat, takenCodes);
    takenCodes.add(code);
    return {
      code,
      cat,
      shortLabel: meta?.shortLabel ?? cat,
      unitNoun: meta?.unitNoun ?? "items",
      items,
    };
  });
}

/** Everything the equipment pages render, derived from one set of rows. */
export interface CatalogueView {
  categories: readonly EquipmentCategory[];
  allItems: readonly EquipmentItem[];
  totalItems: number;
  totalCategories: number;
  /** ["ALL", "CAM", "LIT", …] */
  filterTabs: readonly string[];
  /** Cover strip, e.g. "22 ITEMS · 5 CATEGORIES". */
  strapline: string;
  /** Hero pull-out bar, e.g. [{ label: "CAMERAS", value: "5 bodies" }, …]. */
  summary: readonly { label: string; value: string }[];
}

export function deriveCatalogue(rows: readonly EquipmentSourceRow[]): CatalogueView {
  const categories = buildCatalogue(rows);
  const allItems = categories.flatMap((c) => c.items);
  return {
    categories,
    allItems,
    totalItems: allItems.length,
    totalCategories: categories.length,
    filterTabs: ["ALL", ...categories.map((c) => c.code)],
    strapline: `${allItems.length} ITEMS · ${categories.length} CATEGORIES`,
    summary: categories.map((c) => ({
      label: c.shortLabel,
      value: `${c.items.length} ${c.unitNoun}`,
    })),
  };
}

/** The rows shipped in the repository. The seed, and the fallback. */
export const SEED_ROWS: readonly EquipmentSourceRow[] = (source as EquipmentSource).rows;

/** The seed, derived. Used by scripts and as the fallback view. */
export const SEED_CATALOGUE: CatalogueView = deriveCatalogue(SEED_ROWS);

export type FilterTab = string;

export function itemByCode(
  items: readonly EquipmentItem[],
  code: string
): EquipmentItem | undefined {
  return items.find((i) => i.code === code);
}

/** Never undefined — an item with no photos is a normal case, not an error. */
export function itemPhotos(item: EquipmentItem): readonly EquipmentPhoto[] {
  return item.photos ?? [];
}

/** Long-form copy, falling back to the one-line ledger spec. */
export function itemDescription(item: EquipmentItem): string {
  return item.description?.trim() || item.spec;
}

/**
 * Gear bundles sold as booking/pricing add-ons. Members are catalogue codes, so
 * a sync that drops an item fails validation instead of shipping an add-on that
 * sells gear the studio no longer has. See scripts/validate-equipment.ts.
 */
export const EQUIPMENT_BUNDLES: readonly EquipmentBundle[] = [
  {
    id: "cam",
    label: "Camera bundle (FX6 + 3 lenses)",
    memberCodes: ["CAM-01", "LNS-01", "LNS-02", "LNS-03"],
    rate: { kind: "fixed", amount: 240, per: "day" },
  },
  {
    id: "light",
    label: "Lighting bundle (3× Aputure)",
    memberCodes: ["LIT-01", "LIT-02", "LIT-04"],
    rate: { kind: "fixed", amount: 180, per: "day" },
  },
];

/** Explicit bundle price, or the sum of its members' day rates. */
export function bundleAmount(
  bundle: EquipmentBundle,
  items: readonly EquipmentItem[]
): number | null {
  if (bundle.rate) return rateAmount(bundle.rate);
  let sum = 0;
  for (const code of bundle.memberCodes) {
    const amount = rateAmount(itemByCode(items, code)?.rate ?? { kind: "onRequest" });
    if (amount === null) return null;
    sum += amount;
  }
  return sum;
}

export function bundleById(id: string): EquipmentBundle | undefined {
  return EQUIPMENT_BUNDLES.find((b) => b.id === id);
}
