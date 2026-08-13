"use client";

/**
 * Small pieces shared by the equipment ledger row and the detail modal.
 *
 * Extracted so the "€ is PREFIXED here" exception (see src/lib/money.ts) lives
 * in exactly one place instead of being re-typed in the modal.
 */

import { kiddoColors } from "@/components/kiddo-assets";
import { STOCK_BAR_MAX } from "@/data/equipment";
import type { EquipmentItem } from "@/data/types";
import { eurPrefix, formatRate, periodSuffix } from "@/lib/money";

export const monoStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
};

export const monoXsStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

export const displayStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 400,
  textTransform: "uppercase",
  letterSpacing: "-0.02em",
  lineHeight: 0.9,
};

export function StockBars({
  count,
  max = STOCK_BAR_MAX,
}: {
  count: number;
  max?: number;
}) {
  const filled = Math.min(count, max);
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 14,
            borderRadius: 2,
            background: i < filled ? kiddoColors.black : "rgba(0,0,0,0.12)",
            transition: "background 0.15s",
          }}
        />
      ))}
    </div>
  );
}

export function HotBadge() {
  return (
    <span
      style={{
        marginLeft: 4,
        display: "inline-block",
        background: kiddoColors.lime,
        color: kiddoColors.black,
        fontSize: 7,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "1px 4px",
        borderRadius: 2,
        verticalAlign: "middle",
      }}
    >
      HOT
    </span>
  );
}

/**
 * The ledger price. NOTE: this is the one place on the site that PREFIXES the €
 * symbol and renders the period in its own span. Everywhere else suffixes it.
 */
export function ItemPrice({ item }: { item: EquipmentItem }) {
  if (item.rate.kind === "free" || item.rate.kind === "onRequest") {
    return (
      <span
        style={{
          ...monoStyle,
          color: kiddoColors.black,
          background: kiddoColors.lime,
          padding: "3px 7px",
          borderRadius: 3,
          display: "inline-block",
        }}
      >
        {formatRate(item.rate)}
      </span>
    );
  }
  return (
    <span style={{ ...monoStyle, color: kiddoColors.black, fontWeight: 700 }}>
      {eurPrefix(item.rate.amount)}
      <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.4)", marginLeft: 2 }}>
        {periodSuffix(item.rate.per)}
      </span>
    </span>
  );
}
