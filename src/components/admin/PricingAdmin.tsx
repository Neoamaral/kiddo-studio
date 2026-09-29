"use client";

/**
 * The studio rate card editor.
 *
 * Edits the whole document and saves it in one write, like the catalogue: the
 * numbers only make sense together — a package price and the VAT rate applied
 * to it are not separate facts.
 */

import { useCallback, useEffect, useState } from "react";
import type { PricingSource } from "@/data/types";
import { Banner, Button, Label, field, mono } from "./ui";

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string; details?: string[] };

export default function PricingAdmin() {
  const [data, setData] = useState<PricingSource | null>(null);
  const [version, setVersion] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/pricing");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadError(body.error ?? "Could not load the rate card");
      return;
    }
    const body = (await res.json()) as {
      data: PricingSource;
      version: string;
      readOnly: boolean;
    };
    setData(body.data);
    setVersion(body.version);
    setReadOnly(body.readOnly);
    setDirty(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (p: Partial<PricingSource>) => {
    setData((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
  };

  async function save() {
    if (!data) return;
    setStatus({ kind: "saving" });
    const res = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, version }),
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
    void load();
  }

  if (loadError) return <Banner tone="error">{loadError}</Banner>;
  if (!data) return <p style={{ ...mono, color: "rgba(0,0,0,0.5)" }}>Loading…</p>;

  const box: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.15)",
    background: "#fff",
    padding: 18,
    marginBottom: 14,
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, textTransform: "uppercase" }}>
          Pricing
        </h1>
        <div style={{ marginLeft: "auto" }}>
          <Button
            kind="primary"
            onClick={save}
            disabled={readOnly || !dirty || status.kind === "saving"}
          >
            {status.kind === "saving" ? "Saving…" : "Save & publish"}
          </Button>
        </div>
      </div>

      {readOnly && (
        <Banner tone="info">
          Storage is not connected, so nothing can be saved. These are the rates
          that shipped with the site.
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
      {dirty && status.kind !== "saving" && <Banner tone="info">Unsaved changes.</Banner>}

      <Banner tone="info">
        Every amount here EXCLUDES IVA, exactly as the studio&apos;s rate card is
        written. The site adds {Math.round(data.vatRate * 100)}% at the edge.
      </Banner>

      {/* ── Packages ── */}
      {data.packages.map((pkg, i) => (
        <div key={pkg.id} style={box}>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 14 }}>
            <span style={{ ...mono, color: "rgba(0,0,0,0.45)" }}>{pkg.tag || pkg.id}</span>
            <strong style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{pkg.name}</strong>
            <label style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!pkg.featured}
                onChange={(e) =>
                  patch({
                    packages: data.packages.map((p, n) =>
                      n === i ? { ...p, featured: e.target.checked || undefined } : p
                    ),
                  })
                }
              />
              <span style={{ ...mono, color: "rgba(0,0,0,0.6)" }}>Featured</span>
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: 12,
            }}
          >
            <div>
              <Label>Name</Label>
              <input
                aria-label={`Name of package ${i + 1}`}
                style={field}
                value={pkg.name}
                onChange={(e) =>
                  patch({
                    packages: data.packages.map((p, n) =>
                      n === i ? { ...p, name: e.target.value } : p
                    ),
                  })
                }
              />
            </div>
            {data.durations.map((d) => (
              <div key={d.id}>
                <Label>
                  {d.label} (€, excl. IVA)
                </Label>
                <input
                  aria-label={`${d.label} price of package ${i + 1}`}
                  style={field}
                  type="number"
                  min={0}
                  step={1}
                  value={pkg.rates[d.id] ?? 0}
                  onChange={(e) =>
                    patch({
                      packages: data.packages.map((p, n) =>
                        n === i
                          ? { ...p, rates: { ...p.rates, [d.id]: Math.round(Number(e.target.value)) } }
                          : p
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <Label>Includes — one per line</Label>
            <textarea
              aria-label={`What package ${i + 1} includes`}
              style={{ ...field, minHeight: 88, resize: "vertical" }}
              value={pkg.includes.join("\n")}
              onChange={(e) =>
                patch({
                  packages: data.packages.map((p, n) =>
                    n === i
                      ? { ...p, includes: e.target.value.split("\n").filter((l) => l.trim()) }
                      : p
                  ),
                })
              }
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <Label>Equipment list link</Label>
            <input
              aria-label={`Equipment list link for package ${i + 1}`}
              style={field}
              value={pkg.equipmentListUrl}
              onChange={(e) =>
                patch({
                  packages: data.packages.map((p, n) =>
                    n === i ? { ...p, equipmentListUrl: e.target.value } : p
                  ),
                })
              }
            />
          </div>
        </div>
      ))}

      {/* ── Rules ── */}
      <div style={box}>
        <h2 style={{ ...mono, fontSize: 11, marginBottom: 14 }}>TIME RULES & SURCHARGES</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            gap: 12,
          }}
        >
          <div>
            <Label>Overtime €/h</Label>
            <input
              aria-label="Standard overtime rate"
              style={field}
              type="number"
              min={0}
              step={1}
              value={data.overtime.standard}
              onChange={(e) =>
                patch({ overtime: { ...data.overtime, standard: Math.round(Number(e.target.value)) } })
              }
            />
          </div>
          <div>
            <Label>Off-hours €/h</Label>
            <input
              aria-label="Off-hours overtime rate"
              style={field}
              type="number"
              min={0}
              step={1}
              value={data.overtime.offHours}
              onChange={(e) =>
                patch({ overtime: { ...data.overtime, offHours: Math.round(Number(e.target.value)) } })
              }
            />
          </div>
          <div>
            <Label>Opens</Label>
            <input
              aria-label="Opening time"
              style={field}
              value={data.studioDay.open}
              onChange={(e) => patch({ studioDay: { ...data.studioDay, open: e.target.value } })}
            />
          </div>
          <div>
            <Label>Closes</Label>
            <input
              aria-label="Closing time"
              style={field}
              value={data.studioDay.close}
              onChange={(e) => patch({ studioDay: { ...data.studioDay, close: e.target.value } })}
            />
          </div>
          <div>
            <Label>Weekend ×</Label>
            <input
              aria-label="Weekend multiplier"
              style={field}
              type="number"
              min={1}
              step={0.05}
              value={data.weekendMultiplier}
              onChange={(e) => patch({ weekendMultiplier: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>IVA (0.23 = 23%)</Label>
            <input
              aria-label="VAT rate"
              style={field}
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={data.vatRate}
              onChange={(e) => patch({ vatRate: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* ── Add-ons ── */}
      <div style={box}>
        <h2 style={{ ...mono, fontSize: 11, marginBottom: 14 }}>ADD-ONS</h2>
        {data.addons.map((a, i) => {
          const priced = a.rate.kind === "fixed" || a.rate.kind === "from";
          return (
            <div
              key={a.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gap: 10,
                marginBottom: 10,
                alignItems: "end",
              }}
            >
              <div>
                <Label>Label</Label>
                <input
                  aria-label={`Label of add-on ${i + 1}`}
                  style={field}
                  value={a.label}
                  onChange={(e) =>
                    patch({
                      addons: data.addons.map((x, n) =>
                        n === i ? { ...x, label: e.target.value } : x
                      ),
                    })
                  }
                />
              </div>
              <div>
                <Label>Kind</Label>
                <select
                  aria-label={`Price kind of add-on ${i + 1}`}
                  style={field}
                  value={a.rate.kind}
                  onChange={(e) => {
                    const kind = e.target.value as typeof a.rate.kind;
                    patch({
                      addons: data.addons.map((x, n) =>
                        n === i
                          ? {
                              ...x,
                              rate:
                                kind === "free" || kind === "onRequest"
                                  ? { kind }
                                  : { kind, amount: priced ? (a.rate as { amount: number }).amount : 0, per: "unit" },
                            }
                          : x
                      ),
                    });
                  }}
                >
                  <option value="fixed">Fixed</option>
                  <option value="from">From</option>
                  <option value="free">Free</option>
                  <option value="onRequest">On request</option>
                </select>
              </div>
              <div>
                <Label>€ excl. IVA</Label>
                <input
                  aria-label={`Amount of add-on ${i + 1}`}
                  style={field}
                  type="number"
                  min={0}
                  step={1}
                  disabled={!priced}
                  value={priced ? (a.rate as { amount: number }).amount : ""}
                  onChange={(e) =>
                    patch({
                      addons: data.addons.map((x, n) =>
                        n === i && (x.rate.kind === "fixed" || x.rate.kind === "from")
                          ? { ...x, rate: { ...x.rate, amount: Math.round(Number(e.target.value)) } }
                          : x
                      ),
                    })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
