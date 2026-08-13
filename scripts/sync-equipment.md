# Syncing equipment prices from Notion

The site never talks to Notion at runtime or build time. The sync is an
authoring action: read the page, rewrite `src/data/equipment.source.json`,
review the diff like source code, commit.

**Source page:** "EQUIP RENTAL PRICES — WEB"
`3b9fc4b3670f80a383c8c5ea16c9773d`

## 0. One-time setup

The Notion MCP server is registered in `.mcp.json`. Authorize it once with
`/mcp` in an interactive Claude Code session (OAuth opens in the browser).

## 1. Read the page

Fetch the page via the Notion MCP tools. Record the actual column names — the
mapping below must be filled in on the first real sync, since the page
structure was not known when this file was written.

| Notion column | JSON field | Notes |
| --- | --- | --- |
| _TBD_ | `name` | |
| _TBD_ | `spec` | Optional; empty string if absent |
| _TBD_ | `rate` | Parse per section 2 |
| _TBD_ | `inStock` | Default `1` if the column doesn't exist |
| _TBD_ | `category` | Add to `CATEGORY_META` if new |

## 2. Parse prices at authoring time, not at runtime

The JSON stores an already-parsed `Rate`, so every parse decision shows up in
the git diff. Keep the original cell text in `sourceRaw` so it stays auditable.

| Cell text | Result |
| --- | --- |
| `150€`, `€150`, `150 €/dia` | `{ kind: "fixed", amount: 150, per: "day" }` |
| `150,00` | `150` — `,` is the decimal separator (PT), `.` is thousands |
| `desde 150€`, `a partir de 200€`, `150€+` | `{ kind: "from", … }` |
| `150-200` | `{ kind: "from", amount: 150, … }` |
| `grátis`, `incluído`, `free`, `0` | `{ kind: "free" }` |
| `sob consulta`, `—`, empty | `{ kind: "onRequest" }` |

Round to whole euros — the site has never rendered cents.

**Never convert between periods.** If the sheet quotes per hour, use
`per: "hour"`; do not invent a day rate from it. The ledger renders whatever
period each row carries.

## 3. Rules that protect existing data

- **Item codes are user-visible and must be stable.** Never regenerate a code
  that already exists in the JSON. Assign `${catCode}-${nn}` only to new rows.
- **New categories** need an entry in `CATEGORY_META` in `src/data/equipment.ts`
  (code, shortLabel, unitNoun). Without one they still render via the
  deterministic fallback, but with a generic label.
- **Studio tiers are out of scope.** The 40/140/280/700 rates in
  `src/data/pricing.ts` are hand-authored and must not be touched by a sync.
- **Bundles.** `EQUIPMENT_BUNDLES` references item codes. If the sync removes
  the FX6 or an Aputure, `validate-equipment.ts` fails — fix the bundle rather
  than shipping an add-on that sells gear the studio no longer has.
- **VAT.** If the sheet quotes ex-VAT, set `_meta.vatIncluded: false` and raise
  it — the pricing page states "VAT INCLUDED" as static copy, so mixing
  conventions would be a real error, not a cosmetic one.

## 4. Update `_meta`

Set `syncedAt` (YYYY-MM-DD), `rowCount`, `notes` (the column mapping used), and
replace the placeholder `source` string.

## 5. Verify

```sh
npx tsx scripts/validate-equipment.ts   # codes, rates, bundles, row count
npx tsx scripts/check-quote.ts          # booking maths still consistent
npx tsc --noEmit
npm run build
```

Then diff the built HTML against the previous build. **Only numbers, item names
and category labels should change** — if layout or unrelated pages move, the
mapping is wrong.

Note: `npm run lint` is not usable in this project (`next lint` is deprecated
and drops into an interactive prompt). `tsc --noEmit` plus the build is the gate.

Finally, read the rendered `/equipment` page against the Notion page side by
side. The validator checks structure; only a human catches a right-shaped
price attached to the wrong item.
