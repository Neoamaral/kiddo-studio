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

import { kiddoColors } from "@/components/kiddo-assets";
import { ItemPrice } from "@/components/equipment/ledgerBits";
import { EQUIPMENT_BUNDLES, EQUIPMENT_CATALOGUE, bundleAmount, itemByCode } from "@/data/equipment";
import { eur } from "@/lib/money";

const monoXs: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

export interface EquipmentPickerProps {
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
  value,
  onChange,
  bundleIds,
  onBundlesChange,
  remaining,
  isMobile,
}: EquipmentPickerProps) {
  // Codes already covered by a chosen bundle are shown as included and locked,
  // so nobody adds a body that the bundle already contains.
  const covered = new Set<string>();
  for (const id of bundleIds) {
    const b = EQUIPMENT_BUNDLES.find((x) => x.id === id);
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
    const bundle = EQUIPMENT_BUNDLES.find((x) => x.id === id);
    if (bundle) {
      const next = { ...value };
      for (const c of bundle.memberCodes) delete next[c];
      onChange(next);
    }
    onBundlesChange([...bundleIds, id]);
  };

  return (
    <div>
      {/* Bundle presets */}
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
          {EQUIPMENT_BUNDLES.map((b) => {
            const on = bundleIds.includes(b.id);
            const amount = bundleAmount(b);
            const members = b.memberCodes
              .map((c) => itemByCode(c)?.name)
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

      {/* Catalogue by category */}
      {EQUIPMENT_CATALOGUE.map((cat) => (
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

              return (
                <div
                  key={item.code}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                    opacity: isCovered || soldOut ? 0.55 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 700,
                        color: kiddoColors.black,
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ ...monoXs, color: "rgba(0,0,0,0.4)", marginTop: 2 }}>
                      {isCovered
                        ? "INCLUDED IN BUNDLE"
                        : soldOut
                          ? "SOLD OUT — THAT DATE"
                          : item.spec}
                    </div>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    <ItemPrice item={item} />
                  </div>

                  <div style={{ flexShrink: 0, width: 96, display: "flex", justifyContent: "flex-end" }}>
                    {isCovered || soldOut ? (
                      <span style={{ ...monoXs, color: "rgba(0,0,0,0.3)" }}>
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
