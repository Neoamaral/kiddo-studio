"use client";

/**
 * Equipment selection for the booking flow.
 *
 * Reads the same catalogue the /equipment ledger renders, and reuses ItemPrice
 * from ledgerBits so the "€ is prefixed here" exception stays in one place.
 *
 * Quantity, not a boolean set: stock is per-unit, and phase 2 caps each stepper
 * by what is still free on the chosen date. In phase 1 the cap is the static
 * inStock and `remaining` simply returns it.
 */

import { useState } from "react";
import { kiddoColors } from "@/components/kiddo-assets";
import EquipmentDetailModal from "@/components/equipment/EquipmentDetailModal";
import { ItemPrice, StockBars } from "@/components/equipment/ledgerBits";
import { bundleAmount, itemByCode } from "@/data/equipment";
import type { CatalogueView } from "@/data/equipment";
import type { EquipmentItem } from "@/data/types";
import { eur } from "@/lib/money";

const monoXs: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

export interface EquipmentPickerProps {
  /**
   * The live catalogue, from the page. Editable, so never imported here — and
   * that now includes the quick bundles, which used to be imported and so were
   * baked into the browser bundle at build time.
   */
  catalogue: CatalogueView;
  /** code -> quantity */
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  bundleIds: string[];
  onBundlesChange: (next: string[]) => void;
  /** Units of `code` still bookable on the chosen date. */
  remaining: (code: string, inStock: number) => number;
  isMobile: boolean;
}

export default function EquipmentPicker({
  catalogue,
  value,
  onChange,
  bundleIds,
  onBundlesChange,
  remaining,
  isMobile,
}: EquipmentPickerProps) {
  /*
   * Which item has its photo open. Ephemeral chrome, not booking data, so it
   * stays here rather than in BookingPageClient — that component already holds
   * every field the quote and the POST body read, and this is neither.
   *
   * One modal for the whole step, mounted after the loop. Forty-six of them
   * would be forty-six Escape listeners fighting over one scroll lock.
   */
  const [openItem, setOpenItem] = useState<EquipmentItem | null>(null);

  // Codes already covered by a chosen bundle are shown as included and locked,
  // so nobody adds a body that the bundle already contains.
  const covered = new Set<string>();
  for (const id of bundleIds) {
    const b = catalogue.bundles.find((x) => x.id === id);
    b?.memberCodes.forEach((c) => covered.add(c));
  }

  const setQty = (code: string, qty: number) => {
    const next = { ...value };
    if (qty <= 0) delete next[code];
    else next[code] = qty;
    onChange(next);
  };

  const toggleBundle = (id: string) => {
    if (bundleIds.includes(id)) {
      onBundlesChange(bundleIds.filter((b) => b !== id));
      return;
    }
    // Adding a bundle drops any hand-picked copies of its members, so the
    // client is never charged for the same body twice.
    const bundle = catalogue.bundles.find((x) => x.id === id);
    if (bundle) {
      const next = { ...value };
      for (const c of bundle.memberCodes) delete next[c];
      onChange(next);
    }
    onBundlesChange([...bundleIds, id]);
  };

  return (
    <div>
      {/*
        Bundle presets. Hidden entirely when there are none — the heading used
        to be unconditional, which was harmless while the list was a constant
        and would now leave an orphan "QUICK BUNDLES" label above nothing the
        moment the studio deleted the last one.
      */}
      {catalogue.bundles.length > 0 && (
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...monoXs, color: "rgba(0,0,0,0.4)", marginBottom: 10 }}>
          QUICK BUNDLES
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}
        >
          {catalogue.bundles.map((b) => {
            const on = bundleIds.includes(b.id);
            const amount = bundleAmount(b, catalogue.allItems);
            const members = b.memberCodes
              .map((c) => itemByCode(catalogue.allItems, c)?.name)
              .filter(Boolean)
              .join(" · ");
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBundle(b.id)}
                style={{
                  textAlign: "left",
                  border: on ? `1.5px solid ${kiddoColors.black}` : "1px solid rgba(0,0,0,0.15)",
                  background: on ? "rgba(200,232,32,0.18)" : "#fff",
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: kiddoColors.black }}>
                    {b.label}
                  </span>
                  <span style={{ ...monoXs, color: kiddoColors.black, flexShrink: 0 }}>
                    {amount === null ? "ON REQUEST" : eur(amount)}
                  </span>
                </div>
                {members && (
                  <span style={{ ...monoXs, color: "rgba(0,0,0,0.4)", letterSpacing: "0.12em" }}>
                    {members}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Catalogue by category */}
      {catalogue.categories.map((cat) => (
        <div key={cat.code} style={{ marginBottom: 22 }}>
          <div
            style={{
              ...monoXs,
              color: "rgba(0,0,0,0.4)",
              paddingBottom: 6,
              marginBottom: 8,
              borderBottom: "1px solid rgba(0,0,0,0.12)",
            }}
          >
            {cat.cat}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {cat.items.map((item) => {
              const isCovered = covered.has(item.code);
              const max = remaining(item.code, item.inStock);
              const qty = value[item.code] ?? 0;
              const soldOut = max <= 0;
              const dimmed = isCovered || soldOut;

              return (
                <div
                  key={item.code}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 700,
                        color: kiddoColors.black,
                        /*
                          The dimming used to sit on the row itself. It cannot:
                          a child is never less transparent than its parent, so
                          VIEW DETAILS would have rendered at 55% on every
                          bundled or sold-out row — reading as disabled, which
                          is the wrong signal for the one control left on that
                          row that still does something. It now dims the three
                          things it was always meant to dim, and nothing else.
                        */
                        opacity: dimmed ? 0.55 : 1,
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginTop: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      {/*
                        Status, not description. These two say what the client
                        may do with the item on the date they picked, so they
                        stay on the row. Only item.spec left — and it is still
                        in the popup, under SPEC, with the photo beside it.
                      */}
                      {dimmed && (
                        <span style={{ ...monoXs, color: "rgba(0,0,0,0.4)" }}>
                          {isCovered ? "INCLUDED IN BUNDLE" : "SOLD OUT — THAT DATE"}
                        </span>
                      )}
                      <button
                        type="button"
                        className="bk-info-btn"
                        aria-haspopup="dialog"
                        aria-label={`View ${item.name} photo and description`}
                        onClick={() => setOpenItem(item)}
                        style={{
                          ...monoXs,
                          letterSpacing: "0.18em",
                          color: kiddoColors.black,
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid rgba(0,0,0,0.35)",
                          padding: 0,
                          lineHeight: 1.2,
                          cursor: "pointer",
                        }}
                      >
                        VIEW DETAILS
                      </button>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, opacity: dimmed ? 0.55 : 1 }}>
                    <ItemPrice item={item} />
                  </div>

                  <div style={{ flexShrink: 0, width: 96, display: "flex", justifyContent: "flex-end" }}>
                    {isCovered || soldOut ? (
                      <span
                        style={{
                          ...monoXs,
                          color: "rgba(0,0,0,0.3)",
                          opacity: dimmed ? 0.55 : 1,
                        }}
                      >
                        {isCovered ? "✓" : "—"}
                      </span>
                    ) : (
                      <Stepper
                        qty={qty}
                        max={max}
                        onChange={(n) => setQty(item.code, n)}
                        label={item.name}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/*
        VIEW DETAILS is 9px mono so the row does not grow, which leaves it well
        under the 24px a finger needs. The ::after overlay buys the hit area
        back without entering the layout — rows have 10px of padding and this
        reaches 9px, so neighbouring targets never overlap.
      */}
      <style>{`
        .bk-info-btn { position: relative; }
        .bk-info-btn::after { content: ""; position: absolute; inset: -9px -8px; }
        .bk-info-btn:hover { background: rgba(200,232,32,0.45); }
        .bk-info-btn:focus-visible { outline: 2px solid #1A1A1A; outline-offset: 3px; }
      `}</style>

      {/*
        Everything below is derived HERE, in the render body, never captured in
        the onClick that opened the modal. Captured, "ADD ANOTHER · 2 IN BASKET"
        would freeze at whatever it said when the photo was opened, and a button
        that should have gone disabled would keep taking clicks.
      */}
      {(() => {
        if (!openItem) return <EquipmentDetailModal item={null} onClose={() => setOpenItem(null)} />;
        const code = openItem.code;
        const isCovered = covered.has(code);
        const max = remaining(code, openItem.inStock);
        const qty = value[code] ?? 0;
        const full = qty >= max;

        const line = (text: string) => (
          <div style={{ ...monoXs, color: "rgba(0,0,0,0.4)", marginTop: 4, textAlign: "center" }}>
            {text}
          </div>
        );

        return (
          <EquipmentDetailModal
            item={openItem}
            onClose={() => setOpenItem(null)}
            availability={
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  justifyContent: "flex-end",
                }}
              >
                <StockBars count={max} />
                <span style={{ ...monoXs, color: "rgba(0,0,0,0.45)", letterSpacing: "0.12em" }}>
                  {max} free that day
                </span>
              </span>
            }
            action={
              /*
                A button, never a link. The default footer sends people to
                /booking and /contact, and from inside the booking flow either
                one is a navigation that throws away the date, slot, package and
                details the client has already typed — there is no persistence
                behind this form.
              */
              isCovered ? (
                line("INCLUDED IN YOUR BUNDLE")
              ) : max <= 0 ? (
                line("NONE FREE ON THAT DATE")
              ) : (
                <button
                  type="button"
                  disabled={full}
                  onClick={() => {
                    setQty(code, qty + 1);
                    setOpenItem(null);
                  }}
                  style={{
                    marginTop: 4,
                    width: "100%",
                    padding: "14px 22px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    border: "none",
                    background: full ? "rgba(0,0,0,0.12)" : kiddoColors.black,
                    color: full ? "rgba(0,0,0,0.4)" : kiddoColors.lime,
                    cursor: full ? "default" : "pointer",
                  }}
                >
                  {full
                    ? `ALL ${max} RESERVED`
                    : qty > 0
                      ? `ADD ANOTHER · ${qty} IN BASKET`
                      : "ADD TO BOOKING"}
                </button>
              )
            }
          />
        );
      })()}
    </div>
  );
}

function Stepper({
  qty,
  max,
  onChange,
  label,
}: {
  qty: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const btn = (enabled: boolean): React.CSSProperties => ({
    width: 26,
    height: 26,
    border: `1px solid ${enabled ? kiddoColors.black : "rgba(0,0,0,0.15)"}`,
    background: "transparent",
    color: enabled ? kiddoColors.black : "rgba(0,0,0,0.25)",
    fontFamily: "var(--font-mono)",
    fontSize: 14,
    lineHeight: 1,
    cursor: enabled ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    flexShrink: 0,
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        style={btn(qty > 0)}
        disabled={qty <= 0}
        onClick={() => onChange(qty - 1)}
        aria-label={`Remove one ${label}`}
      >
        −
      </button>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          minWidth: 14,
          textAlign: "center",
          color: qty > 0 ? kiddoColors.black : "rgba(0,0,0,0.3)",
        }}
      >
        {qty}
      </span>
      <button
        type="button"
        style={btn(qty < max)}
        disabled={qty >= max}
        onClick={() => onChange(qty + 1)}
        aria-label={`Add one ${label}`}
      >
        +
      </button>
    </div>
  );
}
