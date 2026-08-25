"use client";

/**
 * Real, month-navigable calendar.
 *
 * Replaces a hardcoded November 2026 grid whose state was a bare day-of-month
 * number and whose "blocked" days were a literal array. Dates are ISO strings
 * throughout, and availability arrives as a prop so the Google integration
 * plugs in without touching this file.
 *
 * `today` is null until the parent's effect resolves it — see the clock-read
 * rule in src/lib/date.ts. That null renders the skeleton, which is also the
 * loading state, so it costs nothing.
 */

import { useState } from "react";
import { kiddoColors } from "@/components/kiddo-assets";
import type { DateBounds, MonthAvailability } from "@/data/availability";
import { dayState, isDaySelectable } from "@/data/availability";
import type { ISODate } from "@/lib/date";
import {
  DOW_LABELS,
  MONTH_NAMES,
  addMonths,
  daysInMonth,
  isoDate,
  mondayIndex,
  monthKey,
  parseISO,
} from "@/lib/date";

const monoXs: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

export interface BookingCalendarProps {
  /** Currently selected date, or null. */
  value: ISODate | null;
  onSelect: (date: ISODate) => void;
  /** Null until the parent resolves "today" in an effect. */
  bounds: DateBounds | null;
  availability: MonthAvailability | null;
  loading: boolean;
  /** Null until the parent's clock effect runs. */
  nowMs: number | null;
  /** Viewed month, "YYYY-MM"; lifted so the parent can fetch it. */
  month: string | null;
  onMonthChange: (month: string) => void;
}

function NavButton({
  dir,
  onClick,
  disabled,
}: {
  dir: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous month" : "Next month"}
      style={{
        width: 30,
        height: 30,
        border: `1px solid ${disabled ? "rgba(0,0,0,0.15)" : kiddoColors.black}`,
        background: "transparent",
        color: disabled ? "rgba(0,0,0,0.25)" : kiddoColors.black,
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        lineHeight: 1,
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {dir === "prev" ? "‹" : "›"}
    </button>
  );
}

export default function BookingCalendar({
  value,
  onSelect,
  bounds,
  availability,
  loading,
  nowMs,
  month,
  onMonthChange,
}: BookingCalendarProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Before the clock resolves there is no honest grid to draw.
  if (!bounds || !month) {
    return (
      <div style={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ ...monoXs, color: "rgba(0,0,0,0.35)" }}>LOADING CALENDAR…</span>
      </div>
    );
  }

  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m1 = Number(mStr);

  const total = daysInMonth(y, m1);
  const leading = mondayIndex(y, m1, 1);

  const minP = parseISO(bounds.min);
  const maxP = parseISO(bounds.max);
  const atMin = !!minP && y === minP.y && m1 === minP.m1;
  const atMax = !!maxP && y === maxP.y && m1 === maxP.m1;

  const days: ISODate[] = Array.from({ length: total }, (_, i) => isoDate(y, m1, i + 1));
  const selectableCount = days.filter((d) =>
    isDaySelectable(dayState(d, availability, bounds, nowMs ?? undefined))
  ).length;

  const step = (n: number) => {
    const next = addMonths(y, m1, n);
    onMonthChange(monthKey(next.y, next.m1));
  };

  const headerRight = loading
    ? "CHECKING…"
    : availability?.degraded
      ? "AVAILABILITY UNCONFIRMED"
      : `${selectableCount} DAYS AVAILABLE`;

  return (
    <div>
      {/* Month header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <NavButton dir="prev" onClick={() => step(-1)} disabled={atMin} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              color: kiddoColors.black,
              minWidth: 190,
              textAlign: "center",
            }}
          >
            {MONTH_NAMES[m1 - 1]} {y}
          </span>
          <NavButton dir="next" onClick={() => step(1)} disabled={atMax} />
        </div>
        <span style={{ ...monoXs, color: "rgba(0,0,0,0.4)" }}>{headerRight}</span>
      </div>

      {/* Weekday labels — Monday first */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
        {DOW_LABELS.map((d) => (
          <div key={d} style={{ ...monoXs, color: "rgba(0,0,0,0.3)", textAlign: "center" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {days.map((iso) => {
          const st = dayState(iso, availability, bounds, nowMs ?? undefined);
          const selectable = !loading && isDaySelectable(st);
          const isSelected = value === iso;
          const isToday = iso === bounds.today;
          const dayNum = Number(iso.slice(8));

          const dotColor =
            st === "unknown"
              ? "transparent"
              : st === "partial"
                ? "transparent"
                : kiddoColors.lime;

          return (
            <button
              key={iso}
              type="button"
              disabled={!selectable}
              onClick={() => selectable && onSelect(iso)}
              onMouseEnter={() => setHovered(iso)}
              onMouseLeave={() => setHovered(null)}
              aria-label={iso}
              aria-current={isToday ? "date" : undefined}
              style={{
                aspectRatio: "1",
                border: isSelected
                  ? `1.5px solid ${kiddoColors.black}`
                  : hovered === iso && selectable
                    ? "1px solid rgba(0,0,0,0.3)"
                    : "1px solid rgba(0,0,0,0.08)",
                background: isSelected
                  ? kiddoColors.lime
                  : isToday
                    ? "rgba(200,232,32,0.15)"
                    : "transparent",
                color: kiddoColors.black,
                opacity: selectable ? 1 : 0.3,
                cursor: selectable ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                padding: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: isToday ? 700 : 400,
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              {dayNum}
              {selectable && !isSelected && (
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: dotColor,
                    border:
                      st === "partial" || st === "unknown"
                        ? `1px solid ${kiddoColors.lime}`
                        : "none",
                    display: "block",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 18, marginTop: 16, flexWrap: "wrap" }}>
        <LegendItem
          swatch={<Dot filled />}
          label={availability?.degraded ? "Selectable" : "Available"}
        />
        {!availability?.degraded && <LegendItem swatch={<Dot />} label="Partly booked" />}
        <LegendItem
          swatch={
            <span
              style={{
                width: 8,
                height: 8,
                background: "rgba(0,0,0,0.15)",
                display: "block",
              }}
            />
          }
          label="Unavailable"
        />
      </div>

      {availability?.degraded && (
        <div style={{ ...monoXs, color: "rgba(0,0,0,0.4)", marginTop: 12, lineHeight: 1.6 }}>
          LIVE AVAILABILITY UNAVAILABLE — WE&apos;LL CONFIRM YOUR SLOT BY EMAIL
        </div>
      )}
    </div>
  );
}

function Dot({ filled = false }: { filled?: boolean }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: filled ? kiddoColors.lime : "transparent",
        border: filled ? "none" : `1px solid ${kiddoColors.lime}`,
        display: "block",
      }}
    />
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      {swatch}
      <span style={{ ...monoXs, color: "rgba(0,0,0,0.4)" }}>{label}</span>
    </div>
  );
}
