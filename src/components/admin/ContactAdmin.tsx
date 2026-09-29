"use client";

/**
 * The contact-details editor.
 *
 * One record, saved in one write, like the rate card. The banner at the top is
 * not decoration: the email address here is where booking requests and contact
 * messages are delivered, and someone editing it to fix a typo on the page
 * needs to know they are also redirecting the studio's inbox.
 */

import { useCallback, useEffect, useState } from "react";
import type { ContactSource, SocialLink } from "@/data/types";
import { Banner, Button, Label, field, mono } from "./ui";

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string; details?: string[] };

const box: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.15)",
  background: "#fff",
  padding: 18,
  marginBottom: 14,
};

const grid = (min: number): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`,
  gap: 12,
});

/** A slug from the label, so "Instagram" and "INSTAGRAM " agree on one id. */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function ContactAdmin() {
  const [data, setData] = useState<ContactSource | null>(null);
  const [version, setVersion] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/contact");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadError(body.error ?? "Could not load the contact details");
      return;
    }
    const body = (await res.json()) as {
      data: ContactSource;
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

  const patch = (p: Partial<ContactSource>) => {
    setData((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
  };

  const patchSocial = (i: number, p: Partial<SocialLink>) => {
    if (!data) return;
    patch({ social: data.social.map((s, n) => (n === i ? { ...s, ...p } : s)) });
  };

  async function save() {
    if (!data) return;
    setStatus({ kind: "saving" });
    const res = await fetch("/api/admin/contact", {
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

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, textTransform: "uppercase" }}>
          Contact
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
          Storage is not connected, so nothing can be saved. These are the
          details that shipped with the site.
        </Banner>
      )}
      {status.kind === "saved" && (
        <Banner tone="ok">Saved. The change is live on the site now.</Banner>
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
        These details appear on the contact page, the home page location band,
        the studio page and the footer — everywhere at once.
      </Banner>

      {/* ── Email & phone ── */}
      <div style={box}>
        <h2 style={{ ...mono, fontSize: 11, marginBottom: 14 }}>EMAIL &amp; PHONE</h2>

        <Banner tone="info">
          <strong>The email address is also the studio&apos;s inbox.</strong> Booking
          requests and messages from the contact form are delivered to whatever is
          typed here. Change it and they follow — so a typo stops the enquiries,
          not just the display.
        </Banner>

        <div style={grid(220)}>
          <div>
            <Label>Email</Label>
            <input
              aria-label="Studio email address"
              style={field}
              type="email"
              value={data.email}
              onChange={(e) => patch({ email: e.target.value })}
            />
          </div>
          <div>
            <Label>Note under the email</Label>
            <input
              aria-label="Note shown under the email"
              style={field}
              value={data.emailNote}
              onChange={(e) => patch({ emailNote: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <input
              aria-label="Studio phone number"
              style={field}
              value={data.phone}
              onChange={(e) => patch({ phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Note under the phone</Label>
            <input
              aria-label="Note shown under the phone"
              style={field}
              value={data.phoneNote}
              onChange={(e) => patch({ phoneNote: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── Address ── */}
      <div style={box}>
        <h2 style={{ ...mono, fontSize: 11, marginBottom: 14 }}>ADDRESS</h2>
        <div style={grid(180)}>
          <div>
            <Label>Street</Label>
            <input
              aria-label="Street address"
              style={field}
              value={data.address.street}
              onChange={(e) => patch({ address: { ...data.address, street: e.target.value } })}
            />
          </div>
          <div>
            <Label>Postcode</Label>
            <input
              aria-label="Postcode"
              style={field}
              value={data.address.postcode}
              onChange={(e) => patch({ address: { ...data.address, postcode: e.target.value } })}
            />
          </div>
          <div>
            <Label>City</Label>
            <input
              aria-label="City"
              style={field}
              value={data.address.city}
              onChange={(e) => patch({ address: { ...data.address, city: e.target.value } })}
            />
          </div>
          <div>
            <Label>Country</Label>
            <input
              aria-label="Country"
              style={field}
              value={data.address.country}
              onChange={(e) => patch({ address: { ...data.address, country: e.target.value } })}
            />
          </div>
          <div>
            <Label>Note (e.g. Free parking)</Label>
            <input
              aria-label="Address note"
              style={field}
              value={data.addressNote}
              onChange={(e) => patch({ addressNote: e.target.value })}
            />
          </div>
        </div>

        <div style={{ ...grid(180), marginTop: 12 }}>
          <div>
            <Label>Latitude</Label>
            <input
              aria-label="Latitude"
              style={field}
              type="number"
              step="0.0001"
              value={data.coordinates.lat}
              onChange={(e) =>
                patch({ coordinates: { ...data.coordinates, lat: Number(e.target.value) } })
              }
            />
          </div>
          <div>
            <Label>Longitude</Label>
            <input
              aria-label="Longitude"
              style={field}
              type="number"
              step="0.0001"
              value={data.coordinates.lon}
              onChange={(e) =>
                patch({ coordinates: { ...data.coordinates, lon: Number(e.target.value) } })
              }
            />
          </div>
        </div>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 12,
            color: "rgba(0,0,0,0.55)",
            lineHeight: 1.6,
            marginTop: 10,
          }}
        >
          The coordinates are printed on the site as written. The map link is
          built from the street address, so the studio shows by name rather than
          as an unnamed pin.
        </p>
      </div>

      {/* ── WhatsApp ── */}
      <div style={box}>
        <h2 style={{ ...mono, fontSize: 11, marginBottom: 14 }}>WHATSAPP</h2>
        <div style={grid(200)}>
          <div>
            <Label>Handle shown</Label>
            <input
              aria-label="WhatsApp handle"
              style={field}
              value={data.whatsapp.handle}
              onChange={(e) => patch({ whatsapp: { ...data.whatsapp, handle: e.target.value } })}
            />
          </div>
          <div>
            <Label>Link (https://wa.me/…)</Label>
            <input
              aria-label="WhatsApp link"
              style={field}
              value={data.whatsapp.url}
              onChange={(e) => patch({ whatsapp: { ...data.whatsapp, url: e.target.value } })}
            />
          </div>
          <div>
            <Label>Note</Label>
            <input
              aria-label="WhatsApp note"
              style={field}
              value={data.whatsapp.note}
              onChange={(e) => patch({ whatsapp: { ...data.whatsapp, note: e.target.value } })}
            />
          </div>
        </div>
      </div>

      {/* ── Social ── */}
      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ ...mono, fontSize: 11 }}>SOCIAL LINKS</h2>
          <div style={{ marginLeft: "auto" }}>
            <Button
              onClick={() =>
                patch({
                  social: [...data.social, { id: "", label: "", handle: "", url: "https://" }],
                })
              }
            >
              + Add
            </Button>
          </div>
        </div>

        {data.social.length === 0 && (
          <p style={{ ...mono, color: "rgba(0,0,0,0.45)" }}>
            None — the social row is hidden on the site.
          </p>
        )}

        {data.social.map((s, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 2fr auto",
              gap: 10,
              marginBottom: 10,
              alignItems: "end",
            }}
          >
            <div>
              <Label>Name</Label>
              <input
                aria-label={`Name of social link ${i + 1}`}
                style={field}
                value={s.label}
                onChange={(e) =>
                  patchSocial(i, {
                    label: e.target.value,
                    // Keep the id in step while it has not been edited by hand.
                    id: !s.id || s.id === slugify(s.label) ? slugify(e.target.value) : s.id,
                  })
                }
              />
            </div>
            <div>
              <Label>Handle shown</Label>
              <input
                aria-label={`Handle of social link ${i + 1}`}
                style={field}
                value={s.handle}
                onChange={(e) => patchSocial(i, { handle: e.target.value })}
              />
            </div>
            <div>
              <Label>Link it opens</Label>
              <input
                aria-label={`Address of social link ${i + 1}`}
                style={field}
                value={s.url}
                onChange={(e) => patchSocial(i, { url: e.target.value })}
              />
            </div>
            <Button
              kind="danger"
              onClick={() => patch({ social: data.social.filter((_, n) => n !== i) })}
              title={`Remove ${s.label || "this link"}`}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
