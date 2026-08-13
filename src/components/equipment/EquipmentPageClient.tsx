"use client";

import { useState } from "react";
import {
  HandwrittenWord,
  CameraSketchIcon,
  TapeStrip,
  ScribbleArrowIcon,
  kiddoColors,
} from "@/components/kiddo-assets";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { EquipmentCategory, EquipmentItem } from "@/data/types";
import {
  CATALOGUE_STRAPLINE,
  CATEGORY_SUMMARY,
  EQUIPMENT_CATALOGUE,
  FILTER_TABS,
  type FilterTab,
} from "@/data/equipment";
import {
  HotBadge,
  ItemPrice,
  StockBars,
  displayStyle,
  monoStyle,
  monoXsStyle,
} from "./ledgerBits";
import EquipmentDetailModal from "./EquipmentDetailModal";

/* ─── Ledger Row ─────────────────────────────────────────────────────────── */

function LedgerRow({
  item,
  onOpen,
}: {
  item: EquipmentItem;
  onOpen: (item: EquipmentItem) => void;
}) {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;

  if (isMobile) {
    return (
      // A native <button>: the platform already handles tap-vs-scroll, so no
      // hand-rolled touchstart/touchend distance logic. Trade-off: text inside
      // a button is not selectable — acceptable, since the modal reproduces
      // every one of these values as selectable text.
      <button
        type="button"
        className="eq-row-btn"
        onClick={() => onOpen(item)}
        aria-haspopup="dialog"
        style={{
          display: "flex",
          width: "100%",
          textAlign: "left",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "14px 0",
          border: "none",
          borderBottom: `1px solid rgba(0,0,0,0.08)`,
          background: "transparent",
          font: "inherit",
          color: "inherit",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* Left: code + name + spec stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
          <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.35)" }}>
            {item.code}{item.hot && <HotBadge />}
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              letterSpacing: "0.05em",
              color: kiddoColors.black,
              fontWeight: 700,
            }}
          >
            {item.name}
          </span>
          <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.45)" }}>
            {item.spec}
          </div>
        </div>
        {/* Right: price + the same "+" affordance as desktop.
            A <span>, not a nested <button> — nested interactives are invalid.
            No aria-label on the row button: it would override the inner text
            and throw away the code, spec and price a screen reader needs. */}
        <div
          style={{
            flexShrink: 0,
            marginLeft: 12,
            paddingTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ItemPrice item={item} />
          <span
            aria-hidden="true"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `1px solid rgba(0,0,0,0.22)`,
              color: "rgba(0,0,0,0.45)",
              fontSize: 18,
              fontFamily: "var(--font-mono)",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            +
          </span>
          <span className="sr-only"> — view details</span>
        </div>
      </button>
    );
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setBtnHovered(false); }}
      style={{
        display: "grid",
        gridTemplateColumns: "90px 1fr 1fr 120px 80px 44px",
        alignItems: "center",
        gap: 0,
        padding: "14px 0",
        borderBottom: `1px solid rgba(0,0,0,0.08)`,
        background: active ? "#F8F5EE" : "transparent",
        transition: "background 0.15s",
        cursor: "default",
      }}
    >
      {/* REF */}
      <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.35)", paddingLeft: 0 }}>
        {item.code}{item.hot && <HotBadge />}
      </div>

      {/* ITEM */}
      <div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            letterSpacing: "0.05em",
            color: kiddoColors.black,
            fontWeight: 700,
          }}
        >
          {item.name}
        </span>
      </div>

      {/* SPEC */}
      <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.45)", paddingRight: 12 }}>
        {item.spec}
      </div>

      {/* STOCK bars */}
      <div>
        <StockBars count={item.inStock} />
        <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.35)", marginTop: 3 }}>
          {item.inStock} avail.
        </div>
      </div>

      {/* PER DAY */}
      <div><ItemPrice item={item} /></div>

      {/* + button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {/* Always rendered — it used to be display:none until row hover, which
            made it unreachable by keyboard and invisible on touch. It still
            *reads* as emerging on hover: faint ghost at rest, solid when
            active. The 44px grid cell was already reserved, so nothing shifts. */}
        <button
          type="button"
          onClick={() => onOpen(item)}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setBtnHovered(false);
          }}
          aria-haspopup="dialog"
          aria-label={`View ${item.name} details and photos`}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: `1px solid ${active ? kiddoColors.black : "rgba(0,0,0,0.22)"}`,
            background: btnHovered ? kiddoColors.lime : "transparent",
            color: active ? kiddoColors.black : "rgba(0,0,0,0.3)",
            opacity: active ? 1 : 0.55,
            fontSize: 20,
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition:
              "background 0.15s, opacity 0.15s, border-color 0.15s, color 0.15s",
            flexShrink: 0,
            outline: focused ? `2px solid ${kiddoColors.black}` : "none",
            outlineOffset: 2,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ─── Category Chapter ───────────────────────────────────────────────────── */

function CategoryChapter({
  category,
  index,
  onOpen,
}: {
  category: EquipmentCategory;
  index: number;
  onOpen: (item: EquipmentItem) => void;
}) {
  const isMobile = useIsMobile();
  const chapterNum = String(index + 1).padStart(2, "0");

  return (
    <div
      id={`cat-${category.code}`}
      style={{ marginBottom: 64 }}
    >
      {/* Chapter header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 20,
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: `2px solid ${kiddoColors.black}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Giant faded number */}
        <span
          style={{
            ...displayStyle,
            fontSize: "clamp(64px, 10vw, 120px)",
            color: "rgba(0,0,0,0.06)",
            lineHeight: 1,
            userSelect: "none",
            position: "absolute",
            right: 0,
            bottom: -4,
          }}
        >
          {chapterNum}
        </span>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.35)", marginBottom: 6 }}>
            CHAPTER {chapterNum}
          </div>
          <h2
            style={{
              ...displayStyle,
              fontSize: "clamp(32px, 5vw, 64px)",
              color: kiddoColors.black,
            }}
          >
            {category.cat}
          </h2>
        </div>

        <div
          style={{
            ...monoXsStyle,
            color: "rgba(0,0,0,0.35)",
            marginBottom: 10,
            marginLeft: 12,
            position: "relative",
            zIndex: 1,
          }}
        >
          {category.items.length} items
        </div>
      </div>

      {/* Column headers — hidden on mobile */}
      {!isMobile && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "90px 1fr 1fr 120px 80px 44px",
            gap: 0,
            paddingBottom: 8,
            borderBottom: `1px solid rgba(0,0,0,0.15)`,
            marginBottom: 0,
          }}
        >
          {["REF", "ITEM", "SPEC", "STOCK", "PER DAY", ""].map((h) => (
            <div key={h} style={{ ...monoXsStyle, color: "rgba(0,0,0,0.35)" }}>
              {h}
            </div>
          ))}
        </div>
      )}

      {/* Rows */}
      {category.items.map((item) => (
        <LedgerRow key={item.code} item={item} onOpen={onOpen} />
      ))}
    </div>
  );
}

/* ─── Section 1: EqCatalogCover ─────────────────────────────────────────── */

function EqCatalogCover() {
  const isMobile = useIsMobile();
  return (
    <section
      style={{
        background: "#F8F5EE",
        color: kiddoColors.black,
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Grid paper SVG background */}
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <defs>
          <pattern id="eqgrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#eqgrid)" />
      </svg>

      {/* Newspaper-style header strip */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderBottom: `2px solid ${kiddoColors.black}`,
          borderTop: `2px solid ${kiddoColors.black}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px clamp(1.25rem, 4vw, 5rem)",
          marginTop: 0,
        }}
      >
        <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.5)" }}>KIDDO STUDIO</span>
        <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.5)" }}>EST. 2023 · LISBON</span>
        <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.5)" }}>CATALOGUE VOL. 1</span>
        <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.5)" }}>{CATALOGUE_STRAPLINE}</span>
      </div>

      {/* Main content */}
      <div
        className="kiddo-container"
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
          gap: "clamp(2rem, 4vw, 5rem)",
          alignItems: "center",
          paddingTop: "clamp(3rem, 6vw, 6rem)",
          paddingBottom: "clamp(2rem, 4vw, 5rem)",
        }}
      >
        {/* Left: Giant headline */}
        <div>
          {/* Label */}
          <p style={{ ...monoXsStyle, color: "rgba(0,0,0,0.4)", marginBottom: 24 }}>
            RENTAL CATALOGUE · PRODUCTION GEAR
          </p>

          {/* Giant headline */}
          <h1
            style={{
              ...displayStyle,
              fontSize: isMobile ? 72 : "clamp(70px, 12vw, 150px)",
              color: kiddoColors.black,
              marginBottom: 16,
            }}
          >
            <span style={{ display: "block" }}>THE</span>
            <span style={{ display: "block" }}>
              <HandwrittenWord
                text="gear"
                color={kiddoColors.lime}
                fontSize={isMobile ? 72 : 150}
                rotation={-2}
              />
            </span>
            <span style={{ display: "block" }}>CATALOGUE.</span>
          </h1>

          {/* Pull-out details bar */}
          <div
            style={{
              display: "flex",
              gap: 32,
              flexWrap: "wrap",
              marginTop: 32,
              paddingTop: 20,
              borderTop: `1px solid rgba(0,0,0,0.12)`,
            }}
          >
            {CATEGORY_SUMMARY.map((d) => (
              <div key={d.label} style={{ minWidth: 80 }}>
                <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.35)", marginBottom: 4 }}>
                  {d.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 400,
                    letterSpacing: "-0.01em",
                    color: kiddoColors.black,
                  }}
                >
                  {d.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Camera sketch with dimension annotations */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
          className="hidden md:flex"
        >
          <div style={{ position: "relative" }}>
            <CameraSketchIcon width={280} height={233} showAccent={true} />

            {/* Dimension annotation: width */}
            <div
              style={{
                position: "absolute",
                bottom: -28,
                left: 0,
                right: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <div style={{ height: 1, flex: 1, background: "rgba(0,0,0,0.25)" }} />
              <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>
                284mm
              </span>
              <div style={{ height: 1, flex: 1, background: "rgba(0,0,0,0.25)" }} />
            </div>

            {/* Dimension annotation: height */}
            <div
              style={{
                position: "absolute",
                top: 0,
                right: -42,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <div style={{ width: 1, flex: 1, background: "rgba(0,0,0,0.25)" }} />
              <span
                style={{
                  ...monoXsStyle,
                  color: "rgba(0,0,0,0.4)",
                  writingMode: "vertical-rl",
                  whiteSpace: "nowrap",
                }}
              >
                124mm
              </span>
              <div style={{ width: 1, flex: 1, background: "rgba(0,0,0,0.25)" }} />
            </div>

            {/* Tape strip decorative */}
            <div style={{ position: "absolute", top: -16, right: -20, zIndex: 10 }}>
              <TapeStrip variant="yellow" width={100} rotation={8} />
            </div>
          </div>

          <div style={{ marginTop: 40 }}>
            <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.35)", textAlign: "center" }}>
              FIG. 01 — TYPICAL CAMERA BODY
            </div>
          </div>
        </div>
      </div>

      {/* Bottom border */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: `2px solid ${kiddoColors.black}`,
        }}
      />
    </section>
  );
}

/* ─── Section 2: EqStickyToolbar ────────────────────────────────────────── */

function EqStickyToolbar({
  active,
  onSelect,
}: {
  active: FilterTab;
  onSelect: (tab: FilterTab) => void;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 64,
        zIndex: 40,
        background: kiddoColors.lime,
        borderBottom: `2px solid ${kiddoColors.black}`,
      }}
    >
      <div
        className="kiddo-container"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "0 clamp(1.25rem, 4vw, 5rem)",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        <style>{`.eq-toolbar::-webkit-scrollbar { display: none; }
          .eq-thumbs::-webkit-scrollbar { display: none; }
          .eq-row-btn:active { background: #F8F5EE; }
          .eq-row-btn:focus-visible { outline: 2px solid #1A1A1A; outline-offset: -2px; }`}</style>
        <div
          className="eq-toolbar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = active === tab;
            return (
              <button
                key={tab}
                onClick={() => onSelect(tab)}
                style={{
                  ...monoStyle,
                  padding: "14px 20px",
                  border: "none",
                  background: isActive ? kiddoColors.black : "transparent",
                  color: isActive ? kiddoColors.lime : kiddoColors.black,
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.2em",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.5)", whiteSpace: "nowrap", padding: "0 8px" }}>
          FILTER BY CATEGORY
        </div>
      </div>
    </div>
  );
}

/* ─── Section 3: EqInventory ─────────────────────────────────────────────── */

function EqInventory({
  activeFilter,
  onOpen,
}: {
  activeFilter: FilterTab;
  onOpen: (item: EquipmentItem) => void;
}) {
  const visibleCategories =
    activeFilter === "ALL"
      ? EQUIPMENT_CATALOGUE
      : EQUIPMENT_CATALOGUE.filter((c) => c.code === activeFilter);

  return (
    <section
      style={{
        background: "#F2EFE6",
        color: kiddoColors.black,
        paddingTop: "clamp(3rem, 5vw, 5rem)",
        paddingBottom: "clamp(4rem, 6vw, 7rem)",
      }}
    >
      <div className="kiddo-container">
        {visibleCategories.map((category, i) => (
          <CategoryChapter
            key={category.code}
            category={category}
            index={EQUIPMENT_CATALOGUE.indexOf(category)}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Section 4: EqCantFindIt ───────────────────────────────────────────── */

function EqCantFindIt() {
  return (
    <section
      style={{
        background: kiddoColors.lime,
        color: kiddoColors.black,
        paddingTop: "clamp(4rem, 7vw, 8rem)",
        paddingBottom: "clamp(4rem, 7vw, 8rem)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid paper bg */}
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.3,
        }}
      >
        <defs>
          <pattern id="eqgrid2" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#eqgrid2)" />
      </svg>

      <div
        className="kiddo-container"
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 40,
        }}
      >
        {/* Label */}
        <p style={{ ...monoXsStyle, color: "rgba(0,0,0,0.5)" }}>
          CUSTOM SOURCING · SPECIAL REQUESTS
        </p>

        {/* Giant headline */}
        <h2
          style={{
            ...displayStyle,
            fontSize: "clamp(48px, 8vw, 110px)",
            color: kiddoColors.black,
            maxWidth: 900,
          }}
        >
          CAN&apos;T FIND IT?{" "}
          <HandwrittenWord
            text="we'll source it."
            color={kiddoColors.black}
            fontSize="inherit"
            rotation={-1}
          />
        </h2>

        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          {/* CTA button */}
          <a
            href="/contact"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              background: kiddoColors.black,
              color: kiddoColors.lime,
              padding: "14px 26px",
              border: `1px solid ${kiddoColors.black}`,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            SEND A SOURCING REQUEST
            <ScribbleArrowIcon variant="right" width={40} height={16} color={kiddoColors.lime} />
          </a>

          {/* Lead time white card */}
          <div
            style={{
              background: "rgba(255,255,255,0.7)",
              border: `1px solid rgba(0,0,0,0.12)`,
              padding: "14px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 200,
            }}
          >
            <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.45)" }}>TYPICAL LEAD TIME</div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 32,
                fontWeight: 400,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                color: kiddoColors.black,
              }}
            >
              3–5 DAYS
            </div>
            <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.4)" }}>
              SUBJECT TO AVAILABILITY
            </div>
          </div>
        </div>

        {/* Arrow down + note */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <ScribbleArrowIcon variant="diagonal" width={40} height={40} color="rgba(0,0,0,0.4)" />
          <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.5)" }}>
            WE WORK WITH TRUSTED LOCAL &amp; INT&apos;L SUPPLIERS
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─── Main Page Component ────────────────────────────────────────────────── */

export default function EquipmentPageClient() {
  const isMobile = useIsMobile();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");
  // One modal for the whole page. Per-row state would mount 22 of them, each
  // with its own Escape listener and scroll-lock claim.
  const [openItem, setOpenItem] = useState<EquipmentItem | null>(null);

  const handleFilterSelect = (tab: FilterTab) => {
    setActiveFilter(tab);
    // Scroll to inventory section
    if (typeof window !== "undefined") {
      const el = document.getElementById("eq-inventory");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main>
      <EqCatalogCover />
      <EqStickyToolbar active={activeFilter} onSelect={handleFilterSelect} />
      <div id="eq-inventory">
        <EqInventory activeFilter={activeFilter} onOpen={setOpenItem} />
      </div>
      <EqCantFindIt />
      <EquipmentDetailModal item={openItem} onClose={() => setOpenItem(null)} />
    </main>
  );
}
