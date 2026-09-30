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

/** Everything the equipment pages render, derived from one document. */
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
  /**
   * The quick bundles, carried here so a client component never has to import
   * them. They are editable, so an import would bake the build's copy into the
   * browser bundle and the studio's edits would never show.
   */
  bundles: readonly EquipmentBundle[];
}

/**
 * Both arguments, no defaults.
 *
 * A default for `bundles` would let a caller that forgot quietly serve the
 * build's copy — the same trap QuoteData spells out. Making it required is what
 * makes the compiler name every call site.
 */
export function deriveCatalogue(
  rows: readonly EquipmentSourceRow[],
  bundles: readonly EquipmentBundle[]
): CatalogueView {
  const categories = buildCatalogue(rows);
  const allItems = categories.flatMap((c) => c.items);
  return {
    bundles,
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

/** The bundles shipped in the repository. Also the fallback for a document
 *  written before bundles moved out of code — see readEquipment(). */
export const SEED_BUNDLES: readonly EquipmentBundle[] =
  (source as EquipmentSource).bundles ?? [];

/** The seed, derived. Used by scripts and as the fallback view. */
export const SEED_CATALOGUE: CatalogueView = deriveCatalogue(SEED_ROWS, SEED_BUNDLES);

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

