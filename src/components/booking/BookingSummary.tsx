"use client";

/**
 * The sticky sidebar: what has been chosen, what it costs, and the confirm CTA.
 *
 * Renders from the same computeQuote() the API recomputes with, so the number
 * the client sees and the number the studio is quoted cannot diverge.
 */

import { CalendarSketchIcon, TapeStrip, kiddoColors } from "@/components/kiddo-assets";
import { BOOKABLE_SPACES } from "@/data/spaces";
import { TIME_SLOTS, slotTimeLabel } from "@/data/booking";
import type { Quote } from "@/lib/quote";
import type { ISODate } from "@/lib/date";
import { formatDateHuman } from "@/lib/date";
import { eur, eurSigned } from "@/lib/money";

export interface BookingSummaryProps {
  date: ISODate | null;
  slotId: string;
  spaceId: string;
  crewSize: string;
  quote: Quote;
  canConfirm: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export default function BookingSummary({
  date,
  slotId,
  spaceId,
  crewSize,
  quote,
  canConfirm,
  isSubmitting,
  onSubmit,
}: BookingSummaryProps) {
  const slotObj = TIME_SLOTS.find((t) => t.id === slotId);
  const spaceObj = BOOKABLE_SPACES.find((s) => s.id === spaceId);

  return (
    <div
      style={{
        background: kiddoColors.nearBlack,
        color: "#fff",
        padding: "28px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: -8, right: 24, zIndex: 2 }}>
        <TapeStrip variant="yellow" width={100} height={24} rotation={-3} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, marginTop: 12 }}>
        <CalendarSketchIcon width={36} color={kiddoColors.lime} />
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 3,
            }}
          >
            Your Booking
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              color: "#fff",
            }}
          >
            {date ? formatDateHuman(date) : "No date selected"}
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <SummaryRow label="Space" value={spaceObj ? spaceObj.label : "—"} />
        <SummaryRow
          label="Slot"
          value={slotObj ? `${slotObj.label} · ${slotTimeLabel(slotObj)}` : "—"}
        />
        <SummaryRow label="Crew" value={crewSize || "—"} />
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {/* Before a slot is picked the quote falls back to the half-day tier.
            Showing that as a real price would be a claim we haven't earned. */}
        <PriceRow
          label={`Base · ${slotObj ? slotObj.label : "Half day"}`}
          value={slotId ? eur(quote.base.amount) : "—"}
        />
        {quote.space && (
          <PriceRow
            label={`Space upgrade · ${quote.space.label}`}
            value={eurSigned(quote.space.amount)}
          />
        )}
        {quote.addons.map((a) => (
          <PriceRow key={a.id} label={a.label} value={eurSigned(a.amount)} />
        ))}
        {quote.bundles.map((b) => (
          <PriceRow key={b.id} label={b.label} value={eurSigned(b.amount)} />
        ))}
        {quote.equipment.map((e) => (
          <PriceRow
            key={e.id}
            label={e.qty > 1 ? `${e.label} ×${e.qty}` : e.label}
            value={eurSigned(e.amount)}
          />
        ))}
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.15)",
          paddingTop: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
            marginBottom: 6,
          }}
        >
          Total
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 56,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: kiddoColors.lime,
          }}
        >
          {slotId ? eur(quote.total) : "—"}
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canConfirm || isSubmitting}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          background: canConfirm && !isSubmitting ? kiddoColors.lime : "rgba(255,255,255,0.1)",
          color: canConfirm && !isSubmitting ? kiddoColors.black : "rgba(255,255,255,0.3)",
          padding: "14px 22px",
          border: `1px solid ${canConfirm && !isSubmitting ? kiddoColors.black : "rgba(255,255,255,0.1)"}`,
          cursor: canConfirm && !isSubmitting ? "pointer" : "not-allowed",
          width: "100%",
          transition: "all 0.15s",
        }}
      >
        {isSubmitting ? "SENDING..." : "CONFIRM BOOKING →"}
      </button>

      {!canConfirm && (
        <div
          style={{
            marginTop: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
            textAlign: "center",
          }}
        >
          Complete every step to confirm
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 12,
          color: "rgba(255,255,255,0.85)",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.1em",
          color: "rgba(255,255,255,0.7)",
          flexShrink: 0,
        }}
      >
        {value}
      </span>
    </div>
  );
}
