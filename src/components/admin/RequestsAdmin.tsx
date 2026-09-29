"use client";

/**
 * The board: every booking request and message the site has taken.
 *
 * Five columns, and a card is dragged between them. Ordering inside a column
 * is by arrival and is not draggable — manual ordering is a whole concurrency
 * problem (two drags, fractional indices, conflicting writes) for a board one
 * person looks at.
 *
 * Confirming is not a status change like the others: it takes the rooms, and
 * the database can refuse it. When it does, the refusal names the booking in
 * the way, because "that slot is taken" is not something anyone can act on.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { slotById, slotTimeLabel } from "@/data/booking";
import { spaceById } from "@/data/spaces";
import { Banner, Button, Label, ago, box, field, money, mono, shortDate } from "./ui";

type Status = "new" | "talking" | "confirmed" | "done" | "lost";

const COLUMNS: { id: Status; label: string; hint: string }[] = [
  { id: "new", label: "NEW", hint: "Just arrived" },
  { id: "talking", label: "IN CONVERSATION", hint: "Talking it through" },
  { id: "confirmed", label: "CONFIRMED", hint: "Holds the room" },
  { id: "done", label: "COMPLETED", hint: "Shot and finished" },
  { id: "lost", label: "LOST", hint: "With the reason" },
];

interface Card {
  ref: string;
  kind: "booking" | "message";
  status: Status;
  name: string | null;
  email: string | null;
  company: string | null;
  date: string | null;
  slotId: string | null;
  spaceId: string | null;
  totalCents: number | null;
  createdAt: string;
  updatedAt: string;
  preview: string | null;
}

interface Detail extends Card {
  phone: string | null;
  crewSize: string | null;
  brief: string | null;
  packageId: string | null;
  addonIds: string[];
  bundleIds: string[];
  equipment: Record<string, number> | null;
  quote: {
    base: { label: string; amount: number };
    space: { label: string; amount: number } | null;
    surcharge: { label: string; amount: number } | null;
    addons: { id: string; label: string; amount: number }[];
    bundles: { id: string; label: string; amount: number }[];
    equipment: { id: string; label: string; qty: number; amount: number }[];
    subtotal: number;
    vat: number;
    total: number;
  } | null;
  lostReason: string | null;
  notes: string;
  clientId: string | null;
}

type Busy =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "error"; message: string };

export default function RequestsAdmin() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>({ kind: "idle" });
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/requests");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadError(body.error ?? "Could not load the board");
      return;
    }
    const body = (await res.json()) as { cards: Card[]; readOnly: boolean };
    setCards(body.cards);
    setReadOnly(body.readOnly);
    setLoadError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCard = useCallback(async (ref: string) => {
    setOpen(ref);
    setDetail(null);
    const res = await fetch(`/api/admin/requests?ref=${encodeURIComponent(ref)}`);
    if (res.ok) setDetail(((await res.json()) as { request: Detail }).request);
  }, []);

  async function move(ref: string, status: Status) {
    setBusy({ kind: "working" });

    let lostReason: string | undefined;
    if (status === "lost") {
      // Asked for, not demanded: the reason is what makes the column worth
      // having, but an empty one must not block the move.
      const answer = window.prompt("Why was it lost? (optional)");
      if (answer === null) {
        setBusy({ kind: "idle" });
        return;
      }
      lostReason = answer;
    }

    const res = await fetch("/api/admin/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref, status, lostReason }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      alreadyConfirmed?: boolean;
    };

    if (!res.ok) {
      setBusy({ kind: "error", message: body.error ?? "That move was refused" });
      // Reload: the board is demonstrably out of date if the database
      // disagreed with it.
      void load();
      return;
    }

    setBusy({ kind: "idle" });
    await load();
    if (open === ref) void openCard(ref);
  }

  async function saveNotes(ref: string, notes: string) {
    setBusy({ kind: "working" });
    const res = await fetch("/api/admin/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref, notes }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setBusy({ kind: "error", message: body.error ?? "Could not save the note" });
      return;
    }
    setBusy({ kind: "idle" });
  }

  async function erase(ref: string) {
    if (
      !window.confirm(
        `Erase ${ref} permanently?\n\nThis removes the request and frees any room it holds. ` +
          `It cannot be undone — use it for an erasure request, not for tidying up.`
      )
    ) {
      return;
    }
    setBusy({ kind: "working" });
    const res = await fetch(`/api/admin/requests?ref=${encodeURIComponent(ref)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setBusy({ kind: "error", message: body.error ?? "Could not erase it" });
      return;
    }
    setBusy({ kind: "idle" });
    setOpen(null);
    await load();
  }

  const byColumn = useMemo(() => {
    const out = new Map<Status, Card[]>(COLUMNS.map((c) => [c.id, []]));
    for (const card of cards ?? []) out.get(card.status)?.push(card);
    return out;
  }, [cards]);

  if (loadError) return <Banner tone="error">{loadError}</Banner>;
  if (!cards) return <p style={{ ...mono, color: "rgba(0,0,0,0.5)" }}>Loading…</p>;

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, textTransform: "uppercase" }}>
          Requests
        </h1>
        <span style={{ ...mono, color: "rgba(0,0,0,0.5)" }}>{cards.length} on the board</span>
        <div style={{ marginLeft: "auto" }}>
          <Button onClick={() => void load()} disabled={busy.kind === "working"}>
            Refresh
          </Button>
        </div>
      </div>

      {readOnly && (
        <Banner tone="info">
          The database is not connected, so there is nothing to show yet.
        </Banner>
      )}
      {busy.kind === "error" && <Banner tone="error">{busy.message}</Banner>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(210px, 1fr))`,
          gap: 10,
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {COLUMNS.map((col) => {
          const list = byColumn.get(col.id) ?? [];
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.id);
              }}
              onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const ref = dragging ?? e.dataTransfer.getData("text/plain");
                setDragging(null);
                if (ref) void move(ref, col.id);
              }}
              style={{
                background: over === col.id ? "#F6FBDD" : "rgba(0,0,0,0.03)",
                border:
                  over === col.id ? "1px dashed #1A1A1A" : "1px solid rgba(0,0,0,0.08)",
                padding: 8,
                minHeight: 180,
              }}
            >
              <div style={{ marginBottom: 8, padding: "2px 2px 6px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ ...mono, fontSize: 10 }}>{col.label}</span>
                  <span style={{ ...mono, fontSize: 10, color: "rgba(0,0,0,0.4)" }}>
                    {list.length}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 11,
                    color: "rgba(0,0,0,0.45)",
                  }}
                >
                  {col.hint}
                </span>
              </div>

              {list.map((card) => {
                const slot = card.slotId ? slotById(card.slotId) : null;
                const space = card.spaceId ? spaceById(card.spaceId) : null;
                return (
                  <div
                    key={card.ref}
                    draggable
                    onDragStart={(e) => {
                      setDragging(card.ref);
                      e.dataTransfer.setData("text/plain", card.ref);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => void openCard(card.ref)}
                    style={{
                      background: "#fff",
                      border: "1px solid rgba(0,0,0,0.18)",
                      borderLeft:
                        card.kind === "message"
                          ? "3px solid rgba(0,0,0,0.35)"
                          : "3px solid #C8E820",
                      padding: 10,
                      marginBottom: 8,
                      cursor: "grab",
                      opacity: dragging === card.ref ? 0.4 : 1,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                      <span style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.45)" }}>
                        {card.kind === "message" ? "MESSAGE" : card.ref}
                      </span>
                      <span
                        style={{
                          ...mono,
                          fontSize: 9,
                          color: "rgba(0,0,0,0.35)",
                          marginLeft: "auto",
                        }}
                      >
                        {ago(card.createdAt)}
                      </span>
                    </div>

                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        lineHeight: 1.2,
                        margin: "4px 0 2px",
                      }}
                    >
                      {card.name || card.email || "—"}
                    </div>

                    {card.company && (
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 11,
                          color: "rgba(0,0,0,0.5)",
                        }}
                      >
                        {card.company}
                      </div>
                    )}

                    {card.date && (
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 12,
                          marginTop: 6,
                        }}
                      >
                        {shortDate(card.date)}
                        {slot ? ` · ${slot.label}` : ""}
                        {space ? ` · ${space.label}` : ""}
                      </div>
                    )}

                    {card.totalCents !== null && (
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 18,
                          marginTop: 4,
                        }}
                      >
                        {money(card.totalCents)}
                      </div>
                    )}

                    {card.preview && !card.date && (
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 11,
                          color: "rgba(0,0,0,0.55)",
                          marginTop: 6,
                          lineHeight: 1.5,
                        }}
                      >
                        {card.preview.slice(0, 90)}
                        {card.preview.length > 90 ? "…" : ""}
                      </div>
                    )}
                  </div>
                );
              })}

              {list.length === 0 && (
                <p style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.3)", padding: 6 }}>
                  Nothing here
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 12,
          color: "rgba(0,0,0,0.5)",
          marginTop: 12,
          lineHeight: 1.7,
        }}
      >
        Drag a card to move it. <strong>Confirmed</strong> takes the room, so the
        date stops being bookable on the site within a few seconds. Moving a
        card back out of Confirmed gives the room up again —{" "}
        <strong>Completed</strong> keeps it, because the shoot happened.
      </p>

      {open && (
        <RequestDetail
          ref_={open}
          detail={detail}
          onClose={() => setOpen(null)}
          onMove={(s) => void move(open, s)}
          onNotes={(n) => void saveNotes(open, n)}
          onErase={() => void erase(open)}
          busy={busy.kind === "working"}
        />
      )}
    </>
  );
}

/* ── One request, in full ─────────────────────────────────────────────────── */

function RequestDetail({
  ref_,
  detail,
  onClose,
  onMove,
  onNotes,
  onErase,
  busy,
}: {
  ref_: string;
  detail: Detail | null;
  onClose: () => void;
  onMove: (s: Status) => void;
  onNotes: (notes: string) => void;
  onErase: () => void;
  busy: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  useEffect(() => {
    if (detail) {
      setNotes(detail.notes ?? "");
      setNotesDirty(false);
    }
  }, [detail]);

  const slot = detail?.slotId ? slotById(detail.slotId) : null;
  const space = detail?.spaceId ? spaceById(detail.spaceId) : null;

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
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
          <span style={{ ...mono, color: "rgba(0,0,0,0.45)" }}>{ref_}</span>
          <div style={{ marginLeft: "auto" }}>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>

        {!detail ? (
          <p style={{ ...mono, color: "rgba(0,0,0,0.5)" }}>Loading…</p>
        ) : (
          <>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                lineHeight: 1.1,
                marginBottom: 4,
              }}
            >
              {detail.name || detail.email || "—"}
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, marginBottom: 16 }}>
              {detail.email && (
                <a href={`mailto:${detail.email}`} style={{ color: "#1A1A1A" }}>
                  {detail.email}
                </a>
              )}
              {detail.phone && (
                <>
                  {" · "}
                  <a href={`tel:${detail.phone.replace(/[^\d+]/g, "")}`} style={{ color: "#1A1A1A" }}>
                    {detail.phone}
                  </a>
                </>
              )}
              {detail.company ? ` · ${detail.company}` : ""}
              {detail.crewSize ? ` · crew ${detail.crewSize}` : ""}
            </p>

            {/* Moves */}
            <div style={{ ...box }}>
              <h3 style={{ ...mono, fontSize: 11, marginBottom: 10 }}>MOVE TO</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COLUMNS.filter((c) => c.id !== detail.status).map((c) => (
                  <Button
                    key={c.id}
                    kind={c.id === "confirmed" ? "primary" : "normal"}
                    disabled={busy}
                    onClick={() => onMove(c.id)}
                    title={c.hint}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  color: "rgba(0,0,0,0.5)",
                  marginTop: 10,
                }}
              >
                Currently <strong>{COLUMNS.find((c) => c.id === detail.status)?.label}</strong>
                {detail.lostReason ? ` — ${detail.lostReason}` : ""}
              </p>
            </div>

            {/* The shoot */}
            {detail.kind === "booking" && (
              <div style={box}>
                <h3 style={{ ...mono, fontSize: 11, marginBottom: 10 }}>THE SHOOT</h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.8 }}>
                  {shortDate(detail.date)}
                  <br />
                  {slot ? `${slot.label} · ${slotTimeLabel(slot)}` : detail.slotId}
                  <br />
                  {space?.label ?? detail.spaceId}
                </p>
              </div>
            )}

            {/* The brief */}
            {detail.brief && (
              <div style={box}>
                <h3 style={{ ...mono, fontSize: 11, marginBottom: 10 }}>BRIEF</h3>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {detail.brief}
                </p>
              </div>
            )}

            {/* The quote, as it was sent */}
            {detail.quote && (
              <div style={box}>
                <h3 style={{ ...mono, fontSize: 11, marginBottom: 4 }}>THE QUOTE</h3>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 11,
                    color: "rgba(0,0,0,0.5)",
                    marginBottom: 10,
                  }}
                >
                  As it was sent. Editing the rate card does not change this — it
                  is what the client was told.
                </p>
                <QuoteLines quote={detail.quote} />
              </div>
            )}

            {/* Notes */}
            <div style={box}>
              <h3 style={{ ...mono, fontSize: 11, marginBottom: 10 }}>NOTES</h3>
              <Label>Only the studio sees these</Label>
              <textarea
                aria-label="Notes about this request"
                style={{ ...field, minHeight: 90, resize: "vertical" }}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesDirty(true);
                }}
              />
              <div style={{ marginTop: 8 }}>
                <Button
                  kind="primary"
                  disabled={!notesDirty || busy}
                  onClick={() => {
                    onNotes(notes);
                    setNotesDirty(false);
                  }}
                >
                  Save note
                </Button>
              </div>
            </div>

            {/* Erasure */}
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
                Removes the request and frees any room it holds. For a genuine
                erasure request — not for tidying the board, which is what LOST
                is for.
              </p>
              <Button kind="danger" disabled={busy} onClick={onErase}>
                Erase permanently
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function QuoteLines({ quote }: { quote: NonNullable<Detail["quote"]> }) {
  const row = (label: string, amount: number, strong = false) => (
    <div
      key={label + amount}
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "5px 0",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        fontFamily: "var(--font-body)",
        fontSize: 13,
        fontWeight: strong ? 700 : 400,
      }}
    >
      <span>{label}</span>
      <span>{money(Math.round(amount * 100))}</span>
    </div>
  );

  return (
    <>
      {row(quote.base.label, quote.base.amount)}
      {quote.space && row(quote.space.label, quote.space.amount)}
      {quote.surcharge && row(quote.surcharge.label, quote.surcharge.amount)}
      {quote.bundles.map((b) => row(b.label, b.amount))}
      {quote.equipment.map((e) =>
        row(`${e.label}${e.qty > 1 ? ` ×${e.qty}` : ""}`, e.amount)
      )}
      {quote.addons.map((a) => row(a.label, a.amount))}
      {row("Subtotal (excl. IVA)", quote.subtotal)}
      {row("IVA", quote.vat)}
      {row("TOTAL", quote.total, true)}
    </>
  );
}
