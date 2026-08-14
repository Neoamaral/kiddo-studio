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
| _TBD_ | `photos` | Download the files — see §4 |
| _TBD_ | `description` | 2–4 sentences; falls back to `spec` when empty |

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
  - **Exception, first real sync only.** Every code currently in the JSON is a
    design-phase placeholder — no row came from the client. Assign all codes
    fresh, in Notion's row order within each category; do not try to name-match
    against the placeholders, since a match could only fire by coincidence and a
    partial match is worse than none (nobody could tell which codes carried
    invented history). Record it in `_meta.notes`.
  - **From sync #2 on**, match rows to the previous JSON by `name` (exact, then
    case/whitespace-insensitive) and reuse the code. New rows get
    `max(nn in that category) + 1` — never reuse a retired number.
  - **A rename is a HALT.** Renaming an item in Notion is indistinguishable from
    "one row deleted, one added", and guessing would mint a new code and orphan
    that item's photo folder. Ask.
- **New categories** need an entry in `CATEGORY_META` in `src/data/equipment.ts`
  (code, shortLabel, unitNoun). Without one they still render via the
  deterministic fallback, but with a generic label — `validate-equipment.ts`
  warns when that happens. The map key is matched by **identity**: a trailing
  space or an en-dash where the data has `·` drops silently to the fallback.
  Pick `code` from the English concept, not a blind slice of a Portuguese label
  (`"ILUMINAÇÃO"` → `LIT`, not `ILU`) — it is the filter-tab label and the SKU
  prefix.
- **Studio tiers are out of scope.** The 40/140/280/700 rates in
  `src/data/pricing.ts` are hand-authored and must not be touched by a sync.
- **Bundles.** `EQUIPMENT_BUNDLES` references item codes. If the sync removes
  the FX6 or an Aputure, `validate-equipment.ts` fails — fix the bundle rather
  than shipping an add-on that sells gear the studio no longer has.
- **VAT.** If the sheet quotes ex-VAT, set `_meta.vatIncluded: false` and raise
  it — the pricing page states "VAT INCLUDED" as static copy, so mixing
  conventions would be a real error, not a cosmetic one.

## 4. Photos

These feed the detail modal that opens from the "+" on each ledger row. An item
with no photos still opens — the modal shows a placeholder and the specs — so
shipping photos incrementally is fine.

### The expiry rule

**Notion file URLs are signed and expire in about an hour.** Never write one into
`equipment.source.json` — not in `src`, not in `sourceRaw`. The page would work
for an hour and then silently show broken images.
`validate-equipment.ts` fails the build on any `src` starting with `http`.

### The automated flow

Downloading, transcoding, naming and writing `photos[]` is **not** done by hand
— `scripts/fetch-equipment-photos.mjs` does all of it from a manifest:

```sh
# 1. While reading Notion, write the manifest (signed URLs + alt text):
#    scripts/.sync/photo-manifest.json   — gitignored, see the schema below
node scripts/fetch-equipment-photos.mjs --dry-run   # manifest ↔ JSON cross-check
npm run sync:photos                                 # download + transcode + write
```

The script — not the agent — writes the `photos[]` arrays, because only it knows
the post-resize dimensions, which downloads actually succeeded, and it derives
the lowercase path in code so a wrong-case folder is structurally impossible.
It exits **non-zero on partial success**, deliberately.

Manifest schema (`version: 1`):

```jsonc
{ "version": 1, "generatedAt": "<ISO UTC>", "notionPageId": "…",
  "items": [ { "code": "CAM-01", "name": "Sony FX6", "photos": [
    { "url": "https://…", "fileName": "IMG_4821.jpg",
      "alt": "Sony FX6 cinema camera body", "caption": "FIG. 01 — BODY" } ] } ] }
```

The script HALTS on: a code with no matching row, a duplicate code, a
non-https URL, a duplicate URL within an item, empty alt, >8 photos, a code that
doesn't lowercase to `[a-z0-9-]+`, or exceeding `--max-total-mb`.

It reports per photo: `EXPIRED` (403/404 — the signed URL aged out; **not**
retried, since retrying only burns the remaining window), `FETCH` (retried 3×
with backoff), `FORMAT` (failed the magic-byte sniff — usually an HTML error
page), `HEIC` (the bundled sharp has no HEIF decoder — ask the client to
re-export as JPEG).

Transcoding: EXIF orientation is baked in with `.rotate()` **before** resizing
(otherwise portrait shots resize on the wrong axis), longest edge 1600 with no
upscaling, then quality 78 → 70 → 62 until the file is under 400 KB. sharp drops
metadata by default, so EXIF/GPS are stripped for free.

Numbering happens **after** collecting successes, so a failed photo leaves no
gap. Stale files in an item's folder are pruned **only when that item had zero
failures** — otherwise a transient 403 would delete last week's good photo.

If a download fails, the photo is simply omitted. The empty case is a
first-class rendering path.

### Naming

```
public/images/equipment/<code-lowercased>/<NN>.jpg
```

`NN` is zero-padded and defines display order; `01` is the cover shown first.

**Lowercase is mandatory.** Development is on Windows, whose filesystem is
case-insensitive; Vercel serves from Linux, which is not.
`/images/equipment/CAM-01/01.jpg` would work perfectly in `npm run dev` and 404
in production. The validator enforces this.

### Export settings

- JPEG, quality ~78, longest edge **1600px** — the gallery stage renders at most
  ~900 CSS px, so 1600 covers 2× DPR without bloating the repo.
- Target ≤250 KB per file. The validator warns above 400 KB.
- **≤6 photos per item.** First one a clean full-item shot.
- Do not commit 4 MB originals. 22 items × 4 photos × 220 KB is already ~19 MB
  of binaries in git.

### Alt text and captions

`alt` is **required** and must be non-empty — the validator fails without it.
Describe what the shot shows ("rear I/O panel"), not the file, and don't just
repeat the item name. `caption` is optional and renders in house style:
`"FIG. 02 — REAR I/O"`.

### Deletions

Removing a photo in Notion means deleting **both** the file and the JSON entry.
The validator warns about image folders no row references.

### Commit order — binaries FIRST

The validator requires every `src` to exist on disk, and the binaries belong in
their own commit. Only one order satisfies both:

1. **Commit 1 — binaries only:** `git add public/images/equipment` (explicit
   path; never `git add -A`). The images are unreferenced at this point, so the
   validator at most warns about orphan folders.
2. **Commit 2 — data + code, atomic:** `equipment.source.json`, `equipment.ts`
   (CATEGORY_META + bundles), this file. Validator green.

Push both together. Every commit in history stays self-consistent.

## 5. Update `_meta`

Set `syncedAt` (YYYY-MM-DD), `rowCount`, `notes` (the column mapping used), and
replace the placeholder `source` string. If photos changed, also set
`photoCount` and `photosSyncedAt`.

## 6. Verify

```sh
npm run validate:equipment   # codes, rates, bundles, row count, category
                             # mapping, and that every photo exists on disk
                             # (case-EXACTLY — fs.existsSync is case-insensitive
                             # on Windows and would miss the Vercel 404 trap)
npm run check:quote          # booking maths still consistent
npx tsc --noEmit
npm run build

git ls-files public/images/equipment | grep '[A-Z]'   # must print NOTHING
```

After deploying, prove the photos actually resolve — this is the only real
check, since the gallery is client-side and contributes nothing to the built
HTML:

```sh
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' \
  https://kiddo-studio.vercel.app/images/equipment/<code>/01.jpg
# expect: 200 image/jpeg
```

Then diff the built HTML against the previous build. **Only numbers, item names
and category labels should change** — if layout or unrelated pages move, the
mapping is wrong.

Note: `npm run lint` is not usable in this project (`next lint` is deprecated
and drops into an interactive prompt). `tsc --noEmit` plus the build is the gate.

Finally, read the rendered `/equipment` page against the Notion page side by
side. The validator checks structure; only a human catches a right-shaped
price attached to the wrong item.
