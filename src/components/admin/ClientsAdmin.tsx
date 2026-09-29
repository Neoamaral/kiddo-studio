"use client";

/**
 * The people who have asked for something, and what they asked for.
 *
 * Every figure on this page — total spend, shoots, last and next visit — is
 * computed by the database on each read, never stored. Kept as columns they
 * would need updating on every change to every request, and the first one
 * anybody forgot would leave a number that is confidently wrong, which is worse
 * than no number.
 *
 * Spend counts confirmed and completed work only. Counting enquiries would
 * flatter every figure here and make the studio's best-looking clients the ones
 * who never booked.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { slotById } from "@/data/booking";
import { spaceById } from "@/data/spaces";
import { Banner, Button, Label, box, field, money, mono, shortDate } from "./ui";

interface Client {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  tags: string[];
  createdAt: string;
  bookings: number;
  enquiries: number;
  spentCents: number;
  lastDate: string | null;
  nextDate: string | null;
}

interface HistoryItem {
  ref: string;
  kind: "booking" | "message";
  status: string;
  date: string | null;
  slotId: string | null;
  spaceId: string | null;
  totalCents: number | null;
  createdAt: string;
  brief: string | null;
}

interface Detail extends Client {
  notes: string;
  history: HistoryItem[];
}

const STATUS_LABEL: Record<string, string> = {
  new: "NEW",
  talking: "IN CONVERSATION",
  confirmed: "CONFIRMED",
  done: "COMPLETED",
  lost: "LOST",
};

export default function ClientsAdmin() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/clients");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadError(body.error ?? "Could not load the clients");
      return;
    }
    const body = (await res.json()) as { clients: Client[]; readOnly: boolean };
    setClients(body.clients);
    setReadOnly(body.readOnly);
    setLoadError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openClient = useCallback(async (id: string) => {
    setOpenId(id);
    setDetail(null);
    const res = await fetch(`/api/admin/clients?id=${encodeURIComponent(id)}`);
    if (res.ok) setDetail(((await res.json()) as { client: Detail }).client);
  }, []);

  async function save(id: string, patch: Record<string, unknown>) {
    setWorking(true);
    setMessage(null);
    const res = await fetch("/api/admin/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    setWorking(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage({ tone: "error", text: body.error ?? "Could not save" });
      return false;
    }
    setMessage({ tone: "ok", text: "Saved." });
    await load();
    return true;
  }

  async function erase(client: Detail) {
    if (
      !window.confirm(
        `Erase ${client.email} permanently?\n\n` +
          `This also removes their ${client.enquiries} request(s) and frees any room they hold. ` +
          `It cannot be undone.`
      )
    ) {
      return;
    }
    setWorking(true);
    const res = await fetch(`/api/admin/clients?id=${encodeURIComponent(client.id)}`, {
      method: "DELETE",
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; requests?: number };
    setWorking(false);
    if (!res.ok) {
      setMessage({ tone: "error", text: body.error ?? "Could not erase" });
      return;
    }
    setOpenId(null);
    setMessage({
      tone: "ok",
      text: `Erased, along with ${body.requests} request(s).`,
    });
    await load();
  }

  const shown = useMemo(() => {
    if (!clients) return [];
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.email, c.name, c.company, ...c.tags]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [clients, query]);

  if (loadError) return <Banner tone="error">{loadError}</Banner>;
  if (!clients) return <p style={{ ...mono, color: "rgba(0,0,0,0.5)" }}>Loading…</p>;

  const cell: React.CSSProperties = {
    padding: "9px 10px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    fontFamily: "var(--font-body)",
    fontSize: 13,
    textAlign: "left",
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, textTransform: "uppercase" }}>
          Clients
        </h1>
        <span style={{ ...mono, color: "rgba(0,0,0,0.5)" }}>{clients.length}</span>
        <div style={{ marginLeft: "auto", minWidth: 220 }}>
          <input
            aria-label="Search clients"
            style={field}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, company, tag"
          />
        </div>
      </div>

      {readOnly && (
        <Banner tone="info">The database is not connected, so there is nobody to show.</Banner>
      )}
      {message && <Banner tone={message.tone}>{message.text}</Banner>}

      <div style={{ ...box, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
          <thead>
            <tr>
              {["Who", "Contact", "Shoots", "Spent", "Last", "Next"].map((h) => (
                <th key={h} style={{ ...cell, ...mono, fontSize: 9, color: "rgba(0,0,0,0.45)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr
                key={c.id}
                onClick={() => void openClient(c.id)}
                style={{ cursor: "pointer" }}
              >
                <td style={cell}>
                  <strong style={{ fontFamily: "var(--font-display)", fontSize: 15 }}>
                    {c.name || "—"}
                  </strong>
                  {c.company && (
                    <div style={{ fontSize: 11, color: "rgba(0,0,0,0.5)" }}>{c.company}</div>
                  )}
                  {c.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            ...mono,
                            fontSize: 8,
                            background: "#C8E820",
                            border: "1px solid #1A1A1A",
                            padding: "1px 5px",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{ ...cell, fontSize: 12 }}>
                  {c.email}
                  {c.phone && <div style={{ color: "rgba(0,0,0,0.55)" }}>{c.phone}</div>}
                </td>
                <td style={cell}>
                  {c.bookings}
                  {c.enquiries > c.bookings && (
                    <span style={{ color: "rgba(0,0,0,0.4)" }}> / {c.enquiries} asked</span>
                  )}
                </td>
                <td style={{ ...cell, fontFamily: "var(--font-display)", fontSize: 16 }}>
                  {money(c.spentCents)}
                </td>
                <td style={{ ...cell, fontSize: 12 }}>{shortDate(c.lastDate)}</td>
                <td style={{ ...cell, fontSize: 12 }}>
                  {c.nextDate ? (
                    <strong>{shortDate(c.nextDate)}</strong>
                  ) : (
                    <span style={{ color: "rgba(0,0,0,0.35)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...cell, ...mono, color: "rgba(0,0,0,0.35)" }}>
                  {query ? "Nobody matches that" : "Nobody yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 12,
          color: "rgba(0,0,0,0.5)",
          lineHeight: 1.7,
        }}
      >
        Spent counts confirmed and completed work only, so an enquiry that went
        nowhere does not flatter the figure. Every number here is worked out
        fresh on each load rather than stored, so none of them can drift.
      </p>

      {openId && (
        <ClientDetail
          detail={detail}
          onClose={() => setOpenId(null)}
          onSave={(patch) => save(openId, patch)}
          onErase={() => detail && void erase(detail)}
          working={working}
        />
      )}
    </>
  );
}

/* ── One client ───────────────────────────────────────────────────────────── */

function ClientDetail({
  detail,
  onClose,
  onSave,
  onErase,
  working,
}: {
  detail: Detail | null;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<boolean>;
  onErase: () => void;
  working: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (detail) {
      setNotes(detail.notes ?? "");
      setTags(detail.tags.join(", "));
      setDirty(false);
    }
  }, [detail]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#F2EFE6",
          width: "min(560px, 100%)",
          height: "100%",
          overflowY: "auto",
          padding: 22,
          borderLeft: "1px solid #1A1A1A",
        }}
      >
        <div style={{ display: "flex", marginBottom: 16 }}>
          <div style={{ marginLeft: "auto" }}>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>

        {!detail ? (
          <p style={{ ...mono, color: "rgba(0,0,0,0.5)" }}>Loading…</p>
        ) : (
          <>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, lineHeight: 1.1 }}>
              {detail.name || detail.email}
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, margin: "4px 0 16px" }}>
              <a href={`mailto:${detail.email}`} style={{ color: "#1A1A1A" }}>
                {detail.email}
              </a>
              {detail.phone && (
                <>
                  {" · "}
                  <a
                    href={`tel:${detail.phone.replace(/[^\d+]/g, "")}`}
                    style={{ color: "#1A1A1A" }}
                  >
                    {detail.phone}
                  </a>
                </>
              )}
              {detail.company ? ` · ${detail.company}` : ""}
            </p>

            <div style={{ ...box, display: "flex", gap: 22, flexWrap: "wrap" }}>
              {[
                ["SHOOTS", String(detail.bookings)],
                ["ASKED", String(detail.enquiries)],
                ["SPENT", money(detail.spentCents)],
                ["NEXT", shortDate(detail.nextDate)],
              ].map(([label, value]) => (
                <div key={label}>
                  <span style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.45)" }}>{label}</span>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, lineHeight: 1.2 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div style={box}>
              <h3 style={{ ...mono, fontSize: 11, marginBottom: 10 }}>NOTES &amp; TAGS</h3>
              <Label>Tags — comma separated</Label>
              <input
                aria-label="Tags"
                style={field}
                value={tags}
                onChange={(e) => {
                  setTags(e.target.value);
                  setDirty(true);
                }}
                placeholder="loyal, video, agency"
              />
              <div style={{ marginTop: 10 }}>
                <Label>Notes — only the studio sees these</Label>
                <textarea
                  aria-label="Notes about this client"
                  style={{ ...field, minHeight: 100, resize: "vertical" }}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <Button
                  kind="primary"
                  disabled={!dirty || working}
                  onClick={async () => {
                    const ok = await onSave({
                      notes,
                      tags: tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    });
                    if (ok) setDirty(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>

            <div style={box}>
              <h3 style={{ ...mono, fontSize: 11, marginBottom: 10 }}>
                EVERYTHING THEY HAVE SENT
              </h3>
              {detail.history.length === 0 && (
                <p style={{ ...mono, color: "rgba(0,0,0,0.4)" }}>Nothing yet</p>
              )}
              {detail.history.map((h) => {
                const slot = h.slotId ? slotById(h.slotId) : null;
                const space = h.spaceId ? spaceById(h.spaceId) : null;
                return (
                  <div
                    key={h.ref}
                    style={{
                      padding: "9px 0",
                      borderBottom: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <span style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.45)" }}>
                        {h.kind === "message" ? "MESSAGE" : h.ref}
                      </span>
                      <span
                        style={{
                          ...mono,
                          fontSize: 8,
                          border: "1px solid rgba(0,0,0,0.25)",
                          padding: "1px 5px",
                        }}
                      >
                        {STATUS_LABEL[h.status] ?? h.status}
                      </span>
                      {h.totalCents !== null && (
                        <span
                          style={{
                            marginLeft: "auto",
                            fontFamily: "var(--font-display)",
                            fontSize: 16,
                          }}
                        >
                          {money(h.totalCents)}
                        </span>
                      )}
                    </div>
                    {h.date && (
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 13, marginTop: 3 }}>
                        {shortDate(h.date)}
                        {slot ? ` · ${slot.label}` : ""}
                        {space ? ` · ${space.label}` : ""}
                      </div>
                    )}
                    {h.brief && (
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 12,
                          color: "rgba(0,0,0,0.55)",
                          marginTop: 4,
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {h.brief.slice(0, 300)}
                        {h.brief.length > 300 ? "…" : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ ...box, borderColor: "rgba(176,0,32,0.3)" }}>
              <h3 style={{ ...mono, fontSize: 11, marginBottom: 6 }}>ERASE</h3>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  color: "rgba(0,0,0,0.55)",
                  lineHeight: 1.6,
                  marginBottom: 10,
                }}
              >
                Removes this person and everything they have sent, and frees any
                room they hold. This is the path for someone asking to be
                forgotten — it cannot be undone.
              </p>
              <Button kind="danger" disabled={working} onClick={onErase}>
                Erase permanently
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
