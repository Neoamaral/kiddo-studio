"use client";

/**
 * The equipment editor.
 *
 * Holds the whole catalogue in state and saves it as one document, because
 * that is what it is. Per-item saves would mean one write and one cache purge
 * each, for no gain.
 *
 * Photos are the exception — they are separate files, uploaded one at a time,
 * and always BEFORE the row that references them is saved. See the photo route
 * for why that order is not arbitrary.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EquipmentBundle, EquipmentSourceRow, Rate } from "@/data/types";
import { codesUsedByBundles } from "@/lib/equipment-validate";
import { Banner, Button, Label, box, field, mono } from "./ui";

/** The gallery is designed for six. */
const MAX_PHOTOS = 6;
/** Longest edge after the browser resizes an upload. */
const MAX_EDGE = 1600;

interface Loaded {
  rows: EquipmentSourceRow[];
  bundles: EquipmentBundle[];
  /** Sent back on save so two editors cannot silently overwrite each other. */
  version: string;
  /** Nothing saved yet — this is what shipped with the site. */
  seeded: boolean;
  readOnly: boolean;
  categories: string[];
}

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; warnings: string[] }
  | { kind: "error"; message: string; details?: string[] };

const blankRow = (): EquipmentSourceRow => ({
  code: "",
  category: "",
  name: "",
  spec: "",
  rate: { kind: "fixed", amount: 0, per: "day" },
  inStock: 1,
});

/**
 * Resizes in a canvas before upload.
 *
 * Keeps sharp out of the serverless runtime and the request small. A phone
 * photo is 4-8MB; this lands around 200KB, which is also what the validator
 * wants.
 */
function resize(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not an image this browser can read"));
    };
    img.src = url;
  });
}

export default function EquipmentAdmin() {
  const [data, setData] = useState<Loaded | null>(null);
  const [rows, setRows] = useState<EquipmentSourceRow[]>([]);
  const [bundles, setBundles] = useState<EquipmentBundle[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  /*
   * A sub-tab, deliberately — not a second page in the sidebar.
   *
   * Items and bundles are ONE document and ONE save: a bundle names catalogue
   * codes, so taking an item out of a bundle and deleting that item has to be
   * a single write or the two disagree in between. Two pages would mean two
   * saves and a version conflict between them; a tab here is only a view.
   */
  const [tab, setTab] = useState<"items" | "bundles">("items");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/admin/equipment");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadError(body.error ?? "Could not load the catalogue");
      return;
    }
    const body = (await res.json()) as Loaded;
    setData(body);
    setRows(body.rows);
    setBundles(body.bundles ?? []);
    setDirty(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Leaving with unsaved rows loses them; nothing is stored until Save.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (i: number, patch: Partial<EquipmentSourceRow>) => {
    setRows((prev) => {
      const before = prev[i];
      const after = { ...before, ...patch };
      /*
       * Renaming an item's code rewrites it in every bundle that sells it.
       *
       * Without this, retyping CAM-01 as CAM-02 leaves the bundle pointing at
       * a code that no longer exists, and the save is refused for a code the
       * studio can see they just fixed. Same motive as parseRow uppercasing:
       * keep coupled fields in step at the point of edit.
       */
      if (patch.code && patch.code !== before.code) {
        const from = before.code;
        const to = patch.code;
        setBundles((bs) =>
          bs.map((b) =>
            b.memberCodes.includes(from)
              ? { ...b, memberCodes: b.memberCodes.map((c) => (c === from ? to : c)) }
              : b
          )
        );
      }
      return prev.map((r, n) => (n === i ? after : r));
    });
    setDirty(true);
  };

  const updateBundle = (i: number, patch: Partial<EquipmentBundle>) => {
    setBundles((prev) => prev.map((b, n) => (n === i ? { ...b, ...patch } : b)));
    setDirty(true);
  };

  /*
   * Derived from the bundles being EDITED, not sent by the server.
   *
   * A server-sent list would describe the stored document while the screen
   * describes the proposed one — so the delete button would stay locked until
   * a save, and the save that would unlock it is the one being blocked.
   */
  const locked = useMemo(() => codesUsedByBundles(bundles), [bundles]);

  async function save() {
    if (!data) return;

    /*
     * A save that REMOVES things asks first.
     *
     * Deleting is one click per item and there is no undo beyond the dated
     * snapshots, so a slip — or a stray script — can empty the catalogue a
     * click at a time with nothing on screen saying how much is about to go.
     * That happened during development: twelve items and both bundles were
     * gone before anyone noticed, and only the snapshots got them back.
     *
     * Only ever asks about REMOVALS. Editing and adding stay one click.
     */
    const goneRows = data.rows.filter((r) => !rows.some((x) => x.code === r.code));
    const goneBundles = (data.bundles ?? []).filter(
      (b) => !bundles.some((x) => x.id === b.id)
    );
    if (goneRows.length || goneBundles.length) {
      const what = [
        goneRows.length
          ? `${goneRows.length} item${goneRows.length === 1 ? "" : "s"} (${goneRows
              .map((r) => r.code)
              .join(", ")})`
          : "",
        goneBundles.length
          ? `${goneBundles.length} bundle${goneBundles.length === 1 ? "" : "s"} (${goneBundles
              .map((b) => b.label || b.id)
              .join(", ")})`
          : "",
      ]
        .filter(Boolean)
        .join(" and ");
      if (!window.confirm(`This save removes ${what}.

Publish anyway?`)) return;
    }

    setStatus({ kind: "saving" });
    const res = await fetch("/api/admin/equipment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, bundles, version: data.version }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      errors?: string[];
      warnings?: string[];
    };
    if (!res.ok) {
      setStatus({ kind: "error", message: body.error ?? "Save failed", details: body.errors });
      return;
    }
    // Warnings are things worth knowing that do not block — a bundle dearer
    // than its parts, an item with no stock. They were computed and discarded
    // before this; now they are shown.
    setStatus({ kind: "saved", warnings: body.warnings ?? [] });
    setDirty(false);
    // Pick up the new version, or the next save conflicts with our own write.
    void load();
  }

  if (loadError) return <Banner tone="error">{loadError}</Banner>;
  if (!data) return <p style={{ ...mono, color: "rgba(0,0,0,0.5)" }}>Loading…</p>;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, textTransform: "uppercase" }}>
          Equipment
        </h1>
        <div style={{ display: "flex", gap: 4 }}>
          {([
            ["items", `ITEMS ${rows.length}`],
            ["bundles", `BUNDLES ${bundles.length}`],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              style={{
                ...mono,
                fontSize: 10,
                padding: "6px 12px",
                cursor: "pointer",
                background: tab === id ? "#C8E820" : "transparent",
                border: tab === id ? "1px solid #1A1A1A" : "1px solid rgba(0,0,0,0.2)",
                color: "#1A1A1A",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {tab === "items" ? (
            <Button
              onClick={() => {
                setRows((r) => [blankRow(), ...r]);
                setOpen("");
                setDirty(true);
              }}
            >
              + Add item
            </Button>
          ) : (
            <Button
              disabled={data.readOnly}
              onClick={() => {
                setBundles((b) => [
                  ...b,
                  { id: "", label: "", memberCodes: [],
                    rate: { kind: "fixed", amount: 0, per: "day" } },
                ]);
                setDirty(true);
              }}
            >
              + Add bundle
            </Button>
          )}
          <Button kind="primary" onClick={save} disabled={data.readOnly || !dirty || status.kind === "saving"}>
            {status.kind === "saving" ? "Saving…" : "Save & publish"}
          </Button>
        </div>
      </div>

      {data.readOnly && (
        <Banner tone="info">
          Storage is not connected, so nothing can be saved. The catalogue below
          is the one that shipped with the site.
        </Banner>
      )}

      {status.kind === "saved" && (
        <Banner tone="ok">
          Saved. The change is live on the site now.
        </Banner>
      )}

      {status.kind === "saved" && status.warnings.length > 0 && (
        <Banner tone="info">
          <strong>Saved, but worth a look:</strong>
          <ul style={{ margin: "8px 0 0 18px" }}>
            {status.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Banner>
      )}

      {status.kind === "error" && (
        <Banner tone="error">
          <strong>{status.message}</strong>
          {status.details?.length ? (
            <ul style={{ margin: "8px 0 0 18px" }}>
              {status.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
        </Banner>
      )}

      {dirty && status.kind !== "saving" && (
        <Banner tone="info">Unsaved changes.</Banner>
      )}

      {tab === "bundles" && (
      <div style={box}>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 12,
            color: "rgba(0,0,0,0.55)",
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          Shown on the booking page above the item list. A bundle is a discount:
          the client pays the bundle price instead of the items inside it, and
          the items stop being chargeable separately.{" "}
          <strong>
            Both tabs save together
          </strong>{" "}
          — so you can take an item out of a bundle and delete it in one go.
        </p>

        {bundles.length === 0 && (
          <p style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.4)" }}>
            None — the booking page shows no QUICK BUNDLES section at all.
          </p>
        )}

        {bundles.map((b, i) => (
          <BundleCard
            key={`${b.id}-${i}`}
            bundle={b}
            index={i}
            rows={rows}
            readOnly={data.readOnly}
            onChange={(patch) => updateBundle(i, patch)}
            onDelete={() => {
              setBundles((prev) => prev.filter((_, n) => n !== i));
              setDirty(true);
            }}
          />
        ))}
      </div>
      )}

      {tab === "items" && (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row, i) => (
          <ItemCard
            key={`${row.code}-${i}`}
            row={row}
            index={i}
            isOpen={open === row.code || (open === "" && i === 0)}
            onToggle={() => setOpen(open === row.code ? null : row.code)}
            onChange={(patch) => update(i, patch)}
            onDelete={() => {
              setRows((prev) => prev.filter((_, n) => n !== i));
              setDirty(true);
            }}
            locked={locked.has(row.code)}
            categories={data.categories}
            readOnly={data.readOnly}
          />
        ))}
      </div>
      )}
    </>
  );
}

/* ── One item ────────────────────────────────────────────────────────────── */

function ItemCard({
  row,
  index,
  isOpen,
  onToggle,
  onChange,
  onDelete,
  locked,
  categories,
  readOnly,
}: {
  row: EquipmentSourceRow;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<EquipmentSourceRow>) => void;
  onDelete: () => void;
  locked: boolean;
  categories: string[];
  readOnly: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const photos = row.photos ?? [];

  async function addPhoto(file: File) {
    setPhotoError(null);
    if (photos.length >= MAX_PHOTOS) {
      setPhotoError(`The gallery shows at most ${MAX_PHOTOS} photos.`);
      return;
    }
    if (!row.code.trim()) {
      setPhotoError("Give the item a code first — it decides the photo's folder.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resize(file);
      const res = await fetch("/api/admin/equipment/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: row.code, index: photos.length + 1, dataUrl }),
      });
      const body = (await res.json().catch(() => ({}))) as { src?: string; error?: string };
      if (!res.ok || !body.src) {
        setPhotoError(body.error ?? "Upload failed");
        return;
      }
      onChange({
        photos: [...photos, { src: body.src, alt: row.name || "Studio equipment" }],
      });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const rate = row.rate as Extract<Rate, { kind: "fixed" | "from" }>;
  const priced = row.rate.kind === "fixed" || row.rate.kind === "from";

  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.15)", background: "#fff" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ ...mono, minWidth: 74, color: "rgba(0,0,0,0.5)" }}>
          {row.code || "NEW"}
        </span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 15, flex: 1 }}>
          {row.name || <em style={{ color: "rgba(0,0,0,0.4)" }}>Untitled</em>}
        </span>
        {photos.length > 0 && (
          <span style={{ ...mono, color: "rgba(0,0,0,0.4)" }}>{photos.length} photo</span>
        )}
        <span style={{ ...mono, color: "rgba(0,0,0,0.4)" }}>{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <div style={{ padding: "4px 14px 18px", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            <div>
              <Label>Code</Label>
              <input
                aria-label={`Code for item ${index + 1}`}
                style={field}
                value={row.code}
                onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <input
                aria-label={`Category for item ${index + 1}`}
                style={field}
                list="admin-categories"
                value={row.category}
                onChange={(e) => onChange({ category: e.target.value })}
              />
              <datalist id="admin-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>In stock</Label>
              <input
                aria-label={`Stock for item ${index + 1}`}
                style={field}
                type="number"
                min={0}
                step={1}
                value={row.inStock}
                onChange={(e) => onChange({ inStock: Math.floor(Number(e.target.value)) })}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Label>Name</Label>
            <input
              aria-label={`Name for item ${index + 1}`}
              style={field}
              value={row.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <Label>Spec — the one line in the ledger</Label>
            <input
              aria-label={`Spec for item ${index + 1}`}
              style={field}
              value={row.spec}
              onChange={(e) => onChange({ spec: e.target.value })}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            <div>
              <Label>Price kind</Label>
              <select
                aria-label={`Price kind for item ${index + 1}`}
                style={field}
                value={row.rate.kind}
                onChange={(e) => {
                  const kind = e.target.value as Rate["kind"];
                  onChange({
                    rate:
                      kind === "free" || kind === "onRequest"
                        ? { kind }
                        : { kind, amount: priced ? rate.amount : 0, per: priced ? rate.per : "day" },
                  });
                }}
              >
                <option value="fixed">Fixed</option>
                <option value="from">From</option>
                <option value="free">Free</option>
                <option value="onRequest">On request</option>
              </select>
            </div>
            {priced && (
              <>
                <div>
                  <Label>Amount (€, excl. IVA)</Label>
                  <input
                    aria-label={`Amount for item ${index + 1}`}
                    style={field}
                    type="number"
                    min={0}
                    step={1}
                    value={rate.amount}
                    onChange={(e) =>
                      onChange({ rate: { ...rate, amount: Math.round(Number(e.target.value)) } })
                    }
                  />
                </div>
                <div>
                  <Label>Per</Label>
                  <select
                    aria-label={`Period for item ${index + 1}`}
                    style={field}
                    value={rate.per}
                    onChange={(e) =>
                      onChange({ rate: { ...rate, per: e.target.value as typeof rate.per } })
                    }
                  >
                    <option value="day">Day</option>
                    <option value="halfDay">Half day</option>
                    <option value="hour">Hour</option>
                    <option value="week">Week</option>
                    <option value="unit">Unit</option>
                  </select>
                </div>
              </>
            )}
            <div>
              <Label>Highlight</Label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 9 }}>
                <input
                  type="checkbox"
                  checked={!!row.hot}
                  onChange={(e) => onChange({ hot: e.target.checked || undefined })}
                />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13 }}>Show as HOT</span>
              </label>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Label>Description — the long copy in the detail panel</Label>
            <textarea
              aria-label={`Description for item ${index + 1}`}
              style={{ ...field, minHeight: 80, resize: "vertical" }}
              value={row.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value || undefined })}
            />
          </div>

          {/* ── Photos ── */}
          <div style={{ marginTop: 18 }}>
            <Label>
              Photos — {photos.length}/{MAX_PHOTOS}
            </Label>
            {photoError && <Banner tone="error">{photoError}</Banner>}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              {photos.map((p, n) => (
                <div key={p.src} style={{ width: 150 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.src}
                    alt={p.alt}
                    style={{
                      width: 150,
                      height: 110,
                      objectFit: "cover",
                      border: "1px solid rgba(0,0,0,0.2)",
                      display: "block",
                    }}
                  />
                  <input
                    aria-label={`Alt text for photo ${n + 1}`}
                    style={{ ...field, fontSize: 12, padding: "6px 8px", marginTop: 4 }}
                    placeholder="Describe this shot"
                    value={p.alt}
                    onChange={(e) =>
                      onChange({
                        photos: photos.map((q, m) =>
                          m === n ? { ...q, alt: e.target.value } : q
                        ),
                      })
                    }
                  />
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <Button
                      onClick={() =>
                        onChange({
                          photos: photos.map((q, m) =>
                            m === n - 1 ? photos[n] : m === n ? photos[n - 1] : q
                          ),
                        })
                      }
                      disabled={n === 0}
                      title="Move earlier"
                    >
                      ←
                    </Button>
                    <Button
                      onClick={() =>
                        onChange({
                          photos: photos.map((q, m) =>
                            m === n + 1 ? photos[n] : m === n ? photos[n + 1] : q
                          ),
                        })
                      }
                      disabled={n === photos.length - 1}
                      title="Move later"
                    >
                      →
                    </Button>
                    <Button
                      kind="danger"
                      onClick={() => onChange({ photos: photos.filter((_, m) => m !== n) })}
                      title="Remove from this item"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}

              <div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  aria-label={`Add a photo to item ${index + 1}`}
                  disabled={readOnly || uploading || photos.length >= MAX_PHOTOS}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void addPhoto(f);
                  }}
                  style={{ ...mono, fontSize: 11 }}
                />
                {uploading && (
                  <p style={{ ...mono, color: "rgba(0,0,0,0.5)", marginTop: 6 }}>Uploading…</p>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <Button
              kind="danger"
              onClick={onDelete}
              disabled={locked}
              title={
                locked
                  ? "A quick bundle sells this item. Take it out of the bundle first — see the BUNDLES tab."
                  : "Delete this item"
              }
            >
              {locked ? "Locked — in a bundle" : "Delete item"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── One bundle ──────────────────────────────────────────────────────────── */

/** "Camera bundle (FX6 + 3 lenses)" → "camera-bundle-fx6-3-lenses" */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function BundleCard({
  bundle,
  index,
  rows,
  readOnly,
  onChange,
  onDelete,
}: {
  bundle: EquipmentBundle;
  index: number;
  /** The rows being EDITED, so an item added in this session can be bundled. */
  rows: EquipmentSourceRow[];
  readOnly: boolean;
  onChange: (patch: Partial<EquipmentBundle>) => void;
  onDelete: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState("");

  const byCode = useMemo(() => new Map(rows.map((r) => [r.code, r])), [rows]);

  /** What the items come to individually — the discount the bundle represents. */
  const partsSum = useMemo(() => {
    let sum = 0;
    for (const code of bundle.memberCodes) {
      const r = byCode.get(code)?.rate;
      // Unknown or on request: the comparison cannot be made honestly.
      if (!r || r.kind === "onRequest") return null;
      sum += r.kind === "free" ? 0 : r.amount;
    }
    return sum;
  }, [bundle.memberCodes, byCode]);

  const price = bundle.rate?.kind === "fixed" ? bundle.rate.amount : 0;
  const saving = partsSum === null ? null : partsSum - price;

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const out = new Map<string, EquipmentSourceRow[]>();
    for (const r of rows) {
      if (q && !`${r.code} ${r.name} ${r.category}`.toLowerCase().includes(q)) continue;
      const list = out.get(r.category) ?? [];
      list.push(r);
      out.set(r.category, list);
    }
    return [...out.entries()];
  }, [rows, filter]);

  const toggle = (code: string) => {
    const has = bundle.memberCodes.includes(code);
    onChange({
      memberCodes: has
        ? bundle.memberCodes.filter((c) => c !== code)
        : [...bundle.memberCodes, code],
    });
  };

  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.18)",
        background: "#fff",
        padding: 14,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 12,
          alignItems: "end",
        }}
      >
        <div>
          <Label>Name — what the client reads</Label>
          <input
            aria-label={`Name of bundle ${index + 1}`}
            style={field}
            value={bundle.label}
            disabled={readOnly}
            onChange={(e) => {
              const label = e.target.value;
              /*
               * The id is minted once from the name and then frozen.
               *
               * It is a key, not a label: it travels in the booking payload and
               * is recorded on the request. Changing it would make any /booking
               * tab already open submit an id the server no longer knows, and
               * be refused with "Unknown option".
               */
              onChange(bundle.id ? { label } : { label, id: slugify(label) });
            }}
          />
        </div>
        <div>
          <Label>Price (€, excl. IVA)</Label>
          <input
            aria-label={`Price of bundle ${index + 1}`}
            style={field}
            type="number"
            min={0}
            step={1}
            disabled={readOnly}
            value={price}
            onChange={(e) =>
              onChange({
                // Always a fixed day rate. "from" would be a lie — the quote
                // charges a `from` amount exactly as it charges a fixed one.
                rate: {
                  kind: "fixed",
                  amount: Math.round(Number(e.target.value)),
                  per: "day",
                },
              })
            }
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "baseline",
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        <span style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.4)" }}>
          ID {bundle.id || "—"}
        </span>
        {partsSum !== null && bundle.memberCodes.length > 0 && (
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 12,
              color: saving !== null && saving < 0 ? "#B00020" : "rgba(0,0,0,0.55)",
            }}
          >
            The items come to {partsSum}€ —{" "}
            {saving === 0
              ? "no discount"
              : saving !== null && saving > 0
                ? `a ${saving}€ discount`
                : `this bundle is ${Math.abs(saving ?? 0)}€ DEARER than the parts`}
          </span>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <Label>Items in this bundle</Label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {bundle.memberCodes.length === 0 && (
            <span style={{ ...mono, fontSize: 9, color: "#B00020" }}>
              Empty — a bundle that sells nothing cannot be saved
            </span>
          )}
          {bundle.memberCodes.map((code) => {
            const item = byCode.get(code);
            return (
              <button
                key={code}
                type="button"
                disabled={readOnly}
                onClick={() => toggle(code)}
                title={item ? `Remove ${item.name}` : "This code is not in the catalogue"}
                style={{
                  ...mono,
                  fontSize: 9,
                  padding: "4px 8px",
                  cursor: readOnly ? "not-allowed" : "pointer",
                  border: item ? "1px solid rgba(0,0,0,0.3)" : "1px solid #B00020",
                  color: item ? "#1A1A1A" : "#B00020",
                  background: "transparent",
                }}
              >
                {code}
                {item ? "" : " — not in the catalogue"} ✕
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <Button disabled={readOnly} onClick={() => setPicking((p) => !p)}>
          {picking ? "Done choosing" : "Choose items"}
        </Button>
        <div style={{ marginLeft: "auto" }}>
          <Button kind="danger" disabled={readOnly} onClick={onDelete}>
            Delete bundle
          </Button>
        </div>
      </div>

      {picking && (
        <div
          style={{
            marginTop: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            padding: 10,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          <input
            aria-label={`Search items for bundle ${index + 1}`}
            style={{ ...field, marginBottom: 10 }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by code, name or category"
          />
          {groups.length === 0 && (
            <p style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.4)" }}>Nothing matches</p>
          )}
          {groups.map(([category, items]) => (
            <div key={category} style={{ marginBottom: 10 }}>
              <div
                style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.4)", marginBottom: 4 }}
              >
                {category}
              </div>
              {items.map((r) => (
                <label
                  key={r.code}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    padding: "3px 0",
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={bundle.memberCodes.includes(r.code)}
                    disabled={readOnly}
                    onChange={() => toggle(r.code)}
                  />
                  <span style={{ ...mono, fontSize: 9, minWidth: 62 }}>{r.code}</span>
                  <span>{r.name}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      ...mono,
                      fontSize: 9,
                      color: "rgba(0,0,0,0.5)",
                    }}
                  >
                    {r.rate.kind === "fixed" || r.rate.kind === "from"
                      ? `${r.rate.amount}€`
                      : r.rate.kind === "free"
                        ? "FREE"
                        : "ON REQUEST"}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
