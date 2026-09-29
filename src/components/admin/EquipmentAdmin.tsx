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

import { useCallback, useEffect, useRef, useState } from "react";
import type { EquipmentSourceRow, Rate } from "@/data/types";
import { Banner, Button, Label, field, mono } from "./ui";

/** The gallery is designed for six. */
const MAX_PHOTOS = 6;
/** Longest edge after the browser resizes an upload. */
const MAX_EDGE = 1600;

interface Loaded {
  rows: EquipmentSourceRow[];
  /** Sent back on save so two editors cannot silently overwrite each other. */
  version: string;
  /** Nothing saved yet — this is what shipped with the site. */
  seeded: boolean;
  readOnly: boolean;
  lockedCodes: string[];
  categories: string[];
}

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
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
  const [open, setOpen] = useState<string | null>(null);
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
    setRows((prev) => prev.map((r, n) => (n === i ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  const locked = new Set(data?.lockedCodes ?? []);

  async function save() {
    if (!data) return;
    setStatus({ kind: "saving" });
    const res = await fetch("/api/admin/equipment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, version: data.version }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      errors?: string[];
    };
    if (!res.ok) {
      setStatus({ kind: "error", message: body.error ?? "Save failed", details: body.errors });
      return;
    }
    setStatus({ kind: "saved" });
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
        <span style={{ ...mono, color: "rgba(0,0,0,0.5)" }}>{rows.length} items</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Button
            onClick={() => {
              setRows((r) => [blankRow(), ...r]);
              setOpen("");
              setDirty(true);
            }}
          >
            + Add item
          </Button>
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
                  ? "A gear bundle sells this item. Remove it from the bundle first."
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
