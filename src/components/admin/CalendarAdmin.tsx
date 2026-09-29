"use client";

/**
 * The studio's calendar: a month at a time, and a way to block time.
 *
 * Blocking writes ONE ROW PER ROOM. That is not a detail of the UI — the site
 * decides availability per room, so a block against one room leaves the other
 * bookable. The room checkboxes default to both, and the API defaults to both
 * when none is given, so the wrong thing takes two deliberate clicks.
 *
 * A booking's hold cannot be removed from here. Un-confirming a shoot happens
 * on the board, where the card says what it is doing.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banner, Button, Label, box, field, money, mono, shortDate } from "./ui";

interface Entry {
  id: number;
  resourceId: string;
  resourceLabel: string;
  kind: "booking" | "blocked";
  startsAt: string;
  endsAt: string;
  date: string;
  label: string | null;
  ref: string | null;
  name: string | null;
  email: string | null;
  slotId: string | null;
  spaceId: string | null;
  totalCents: number | null;
}

interface Resource {
  id: string;
  label: string;
}

interface Slot {
  id: string;
  label: string;
  startLocal: string;
  endLocal: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Which weekday a date falls on, Monday = 0. Sakamoto, same as src/lib/date. */
function weekdayIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  const sundayFirst =
    (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
  return (sundayFirst + 6) % 7; // Sunday-first -> Monday-first
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** "17 February 2027 — 1 entry". Named for a screen reader, not only a test. */
function dayLabel(date: string, entries: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const what = entries === 0 ? "free" : `${entries} entr${entries === 1 ? "y" : "ies"}`;
  return `${d} ${MONTH_NAMES[m - 1]} ${y} — ${what}`;
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + by;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

function daysIn(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from(
    { length: last },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`
  );
}

export default function CalendarAdmin() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [working, setWorking] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  // The block form
  const [blockSlot, setBlockSlot] = useState("");
  const [blockRooms, setBlockRooms] = useState<string[]>([]);
  const [reason, setReason] = useState("");

  const load = useCallback(async (m: string) => {
    const res = await fetch(`/api/admin/calendar?month=${m}`);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadError(body.error ?? "Could not load the calendar");
      return;
    }
    const body = (await res.json()) as {
      entries: Entry[];
      resources: Resource[];
      slots: Slot[];
      readOnly: boolean;
    };
    setEntries(body.entries);
    setResources(body.resources);
    setSlots(body.slots);
    setReadOnly(body.readOnly);
    setLoadError(null);
  }, []);

  useEffect(() => {
    void load(month);
  }, [load, month]);

  const byDate = useMemo(() => {
    const out = new Map<string, Entry[]>();
    for (const e of entries ?? []) {
      const list = out.get(e.date) ?? [];
      list.push(e);
      out.set(e.date, list);
    }
    return out;
  }, [entries]);

  async function block(date: string) {
    setWorking(true);
    setMessage(null);
    const res = await fetch("/api/admin/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        slotId: blockSlot || null,
        resourceIds: blockRooms.length ? blockRooms : null,
        reason,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; created?: number };
    setWorking(false);
    if (!res.ok) {
      setMessage({ tone: "error", text: body.error ?? "Could not block that time" });
      return;
    }
    setMessage({
      tone: "ok",
      text: `Blocked — ${body.created} room${body.created === 1 ? "" : "s"}. The site knows within a few seconds.`,
    });
    setReason("");
    await load(month);
  }

  async function unblock(id: number) {
    setWorking(true);
    setMessage(null);
    const res = await fetch(`/api/admin/calendar?id=${id}`, { method: "DELETE" });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setWorking(false);
    if (!res.ok) {
      setMessage({ tone: "error", text: body.error ?? "Could not remove that" });
      return;
    }
    await load(month);
  }

  if (loadError) return <Banner tone="error">{loadError}</Banner>;

  const days = daysIn(month);
  const leading = days.length ? weekdayIndex(days[0]) : 0;
  const pickedEntries = picked ? (byDate.get(picked) ?? []) : [];

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, textTransform: "uppercase" }}>
          Calendar
        </h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <Button title="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
            ←
          </Button>
          <span style={{ ...mono, fontSize: 11, minWidth: 130, textAlign: "center" }}>
            {monthLabel(month)}
          </span>
          <Button title="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
            →
          </Button>
        </div>
      </div>

      {readOnly && (
        <Banner tone="info">The database is not connected, so the calendar is empty.</Banner>
      )}
      {message && <Banner tone={message.tone}>{message.text}</Banner>}

      {/* The grid */}
      <div style={{ ...box, padding: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.4)", padding: "2px 4px" }}
            >
              {w}
            </div>
          ))}

          {Array.from({ length: leading }, (_, i) => (
            <div key={`pad-${i}`} />
          ))}

          {days.map((date) => {
            const list = byDate.get(date) ?? [];
            const bookings = list.filter((e) => e.kind === "booking");
            const blocks = list.filter((e) => e.kind === "blocked");
            const isPicked = picked === date;
            return (
              <button
                key={date}
                type="button"
                aria-label={dayLabel(date, list.length)}
                aria-pressed={isPicked}
                onClick={() => setPicked(isPicked ? null : date)}
                style={{
                  textAlign: "left",
                  minHeight: 74,
                  padding: 6,
                  background: isPicked ? "#C8E820" : list.length ? "#fff" : "rgba(0,0,0,0.02)",
                  border: isPicked ? "2px solid #1A1A1A" : "1px solid rgba(0,0,0,0.12)",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                <span style={{ ...mono, fontSize: 10 }}>{Number(date.slice(-2))}</span>
                {bookings.length > 0 && (
                  <div style={{ fontSize: 10, marginTop: 3, lineHeight: 1.35 }}>
                    {/* Deduplicated by reference: `both` occupies two rooms and
                        would otherwise show twice. */}
                    {[...new Set(bookings.map((b) => b.ref))].map((ref) => {
                      const b = bookings.find((x) => x.ref === ref)!;
                      return (
                        <div key={ref} style={{ fontWeight: 700 }}>
                          {b.name ?? ref}
                        </div>
                      );
                    })}
                  </div>
                )}
                {blocks.length > 0 && (
                  <div style={{ fontSize: 10, marginTop: 3, color: "rgba(0,0,0,0.5)" }}>
                    {[...new Set(blocks.map((b) => b.label))].join(", ")}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* The day */}
      {picked && (
        <div style={box}>
          <h2 style={{ ...mono, fontSize: 11, marginBottom: 12 }}>{shortDate(picked)}</h2>

          {pickedEntries.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "rgba(0,0,0,0.5)",
                marginBottom: 14,
              }}
            >
              Nothing on this day. It is bookable on the site.
            </p>
          ) : (
            <div style={{ marginBottom: 16 }}>
              {pickedEntries.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <span style={{ ...mono, fontSize: 9, minWidth: 74 }}>{e.resourceLabel}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13 }}>
                    {e.kind === "booking" ? (
                      <>
                        <strong>{e.name ?? e.ref}</strong>
                        {e.totalCents !== null ? ` · ${money(e.totalCents)}` : ""}
                        {e.email ? ` · ${e.email}` : ""}
                      </>
                    ) : (
                      e.label
                    )}
                  </span>
                  <span style={{ marginLeft: "auto" }}>
                    {e.kind === "blocked" ? (
                      <Button kind="danger" disabled={working} onClick={() => void unblock(e.id)}>
                        Remove
                      </Button>
                    ) : (
                      <span style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.4)" }}>
                        {e.ref}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Block time */}
          <h3 style={{ ...mono, fontSize: 11, marginBottom: 10 }}>BLOCK THIS TIME</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>When</Label>
              <select
                aria-label="Which part of the day to block"
                style={field}
                value={blockSlot}
                onChange={(e) => setBlockSlot(e.target.value)}
              >
                <option value="">All day</option>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} · {s.startLocal}–{s.endLocal}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Why</Label>
              <input
                aria-label="Reason for the block"
                style={field}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Maintenance, holiday, held by phone…"
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Label>Which rooms</Label>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {resources.map((r) => (
                <label key={r.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={blockRooms.length === 0 || blockRooms.includes(r.id)}
                    onChange={(e) => {
                      // Empty means every room, which is also what the API
                      // defaults to. Unticking one makes the selection explicit.
                      const all = resources.map((x) => x.id);
                      const current = blockRooms.length === 0 ? all : blockRooms;
                      const next = e.target.checked
                        ? [...new Set([...current, r.id])]
                        : current.filter((id) => id !== r.id);
                      setBlockRooms(next.length === all.length ? [] : next);
                    }}
                  />
                  <span style={{ ...mono, color: "rgba(0,0,0,0.65)" }}>{r.label}</span>
                </label>
              ))}
            </div>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 12,
                color: "rgba(0,0,0,0.5)",
                marginTop: 8,
                lineHeight: 1.6,
              }}
            >
              Both by default. Blocking only one room leaves the other on sale —
              which is sometimes what you want, and is almost never what you
              meant.
            </p>
          </div>

          <div style={{ marginTop: 14 }}>
            <Button kind="primary" disabled={working || readOnly} onClick={() => void block(picked)}>
              {working ? "Blocking…" : "Block it"}
            </Button>
          </div>
        </div>
      )}

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 12,
          color: "rgba(0,0,0,0.5)",
          lineHeight: 1.7,
        }}
      >
        Bookings appear here once they are confirmed on the board. A booking
        cannot be removed from the calendar — move its card out of Confirmed
        instead, so the reason is recorded with it.
      </p>
    </>
  );
}
