"use client";

import { useState } from "react";
import {
  HandwrittenWord,
  CameraSketchIcon,
  TapeStrip,
  ScribbleArrowIcon,
  kiddoColors,
} from "@/components/kiddo-assets";

/* ─── Data ──────────────────────────────────────────────────────────────── */

interface EquipmentItem {
  code: string;
  name: string;
  spec: string;
  price: number;
  hot?: boolean;
  inStock: number;
  free?: boolean;
}

interface EquipmentCategory {
  code: string;
  cat: string;
  count: number;
  items: EquipmentItem[];
}

const EQUIPMENT_DATA: EquipmentCategory[] = [
  {
    code: "CAM",
    cat: "CAMERA · BODIES",
    count: 5,
    items: [
      { code: "CAM-01", name: "Sony FX6",          spec: "Full-frame cine · 4K 120fps",  price: 150, hot: true,  inStock: 1 },
      { code: "CAM-02", name: "Sony FX3",          spec: "Compact cine · 4K 120fps",     price: 120, inStock: 2 },
      { code: "CAM-03", name: "Canon R5 C",        spec: "Hybrid · 8K · RF mount",       price: 130, inStock: 1 },
      { code: "CAM-04", name: "Blackmagic 6K Pro", spec: "Cinema · BRAW",                price: 100, inStock: 2 },
      { code: "CAM-05", name: "Sony A7S III",      spec: "Mirrorless · low-light king",  price: 80,  inStock: 3 },
    ],
  },
  {
    code: "LIT",
    cat: "LIGHTING",
    count: 5,
    items: [
      { code: "LIT-01", name: "Aputure 600d Pro",      spec: "Bowens · daylight · 600W",  price: 70, hot: true, inStock: 2 },
      { code: "LIT-02", name: "Aputure 300x",          spec: "Bicolor · battery option",  price: 45, inStock: 4 },
      { code: "LIT-03", name: "Astera Titan Tubes ×6", spec: "RGB · wireless DMX",        price: 120, inStock: 6 },
      { code: "LIT-04", name: "Aputure MC Pro RGB",    spec: "Pocket pad · CRI 96",       price: 20, inStock: 8 },
      { code: "LIT-05", name: "UV Tube Kit",           spec: "365nm · for fluo shoots",   price: 60, inStock: 2 },
    ],
  },
  {
    code: "LNS",
    cat: "LENSES",
    count: 5,
    items: [
      { code: "LNS-01", name: "Sigma 24-70mm f/2.8",   spec: "E-mount · workhorse zoom",  price: 40, inStock: 2 },
      { code: "LNS-02", name: "Sony GM 85mm f/1.4",    spec: "Portrait · creamy bokeh",   price: 45, inStock: 1 },
      { code: "LNS-03", name: "Sony GM 16-35mm f/2.8", spec: "Wide zoom · landscape",     price: 45, inStock: 1 },
      { code: "LNS-04", name: "Laowa 24mm Probe",      spec: "Macro · weird angles",      price: 60, hot: true, inStock: 1 },
      { code: "LNS-05", name: "Vintage Helios 44-2",   spec: "Swirly · soft · loved",     price: 15, inStock: 3 },
    ],
  },
  {
    code: "AUD",
    cat: "AUDIO",
    count: 3,
    items: [
      { code: "AUD-01", name: "Sennheiser MKH 416",   spec: "Shotgun · industry standard", price: 30, inStock: 2 },
      { code: "AUD-02", name: "Røde Wireless Pro ×2", spec: "Lavalier · 32-bit float",     price: 30, inStock: 2 },
      { code: "AUD-03", name: "Zoom F6 Recorder",     spec: "6-track · 32-bit float",      price: 35, inStock: 1 },
    ],
  },
  {
    code: "GRP",
    cat: "GRIP & SUPPORT",
    count: 4,
    items: [
      { code: "GRP-01", name: "Ronin RS4 Pro",    spec: "Gimbal · 4.5kg payload",  price: 60, inStock: 2 },
      { code: "GRP-02", name: "Manfrotto 504X",   spec: "Tripod · fluid head",     price: 25, inStock: 4 },
      { code: "GRP-03", name: "Slider 1.2m",      spec: "Motorised · timelapse",   price: 35, inStock: 1 },
      { code: "GRP-04", name: "C-stand kit (×4)", spec: "Flags · arms · sandbags", price: 0,  free: true, hot: true, inStock: 6 },
    ],
  },
];

const FILTER_TABS = ["ALL", "CAM", "LIT", "LNS", "AUD", "GRP"] as const;
type FilterTab = (typeof FILTER_TABS)[number];

/* ─── Helper styles ─────────────────────────────────────────────────────── */

const monoStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
};

const monoXsStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

const displayStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 400,
  textTransform: "uppercase",
  letterSpacing: "-0.02em",
  lineHeight: 0.9,
};

/* ─── Stock Bars ─────────────────────────────────────────────────────────── */

function StockBars({ count, max = 8 }: { count: number; max?: number }) {
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 14,
            borderRadius: 2,
            background: i < count ? kiddoColors.black : "rgba(0,0,0,0.12)",
            transition: "background 0.15s",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Ledger Row ─────────────────────────────────────────────────────────── */

function LedgerRow({ item }: { item: EquipmentItem }) {
  const [hovered, setHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

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
        background: hovered ? "#F8F5EE" : "transparent",
        transition: "background 0.15s",
        cursor: "default",
      }}
    >
      {/* REF */}
      <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.35)", paddingLeft: 0 }}>
        {item.code}
        {item.hot && (
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
        )}
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
      <div>
        {item.free ? (
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
            FREE
          </span>
        ) : (
          <span style={{ ...monoStyle, color: kiddoColors.black, fontWeight: 700 }}>
            €{item.price}
            <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.4)", marginLeft: 2 }}>/day</span>
          </span>
        )}
      </div>

      {/* + button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          aria-label={`Enquire about ${item.name}`}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: `1px solid ${kiddoColors.black}`,
            background: btnHovered ? kiddoColors.lime : "transparent",
            color: kiddoColors.black,
            fontSize: 20,
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
            display: hovered ? "flex" : "none",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.15s",
            flexShrink: 0,
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
}: {
  category: EquipmentCategory;
  index: number;
}) {
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
          {category.count} items
        </div>
      </div>

      {/* Column headers */}
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

      {/* Rows */}
      {category.items.map((item) => (
        <LedgerRow key={item.code} item={item} />
      ))}
    </div>
  );
}

/* ─── Section 1: EqCatalogCover ─────────────────────────────────────────── */

function EqCatalogCover() {
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
        <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.5)" }}>22 ITEMS · 5 CATEGORIES</span>
      </div>

      {/* Main content */}
      <div
        className="kiddo-container"
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr auto",
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
              fontSize: "clamp(70px, 12vw, 150px)",
              color: kiddoColors.black,
              marginBottom: 16,
            }}
          >
            <span style={{ display: "block" }}>THE</span>
            <span style={{ display: "block" }}>
              <HandwrittenWord
                text="gear"
                color={kiddoColors.lime}
                fontSize={150}
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
            {[
              { label: "CAMERAS", value: "5 bodies" },
              { label: "LIGHTING", value: "5 fixtures" },
              { label: "LENSES", value: "5 optics" },
              { label: "AUDIO", value: "3 mics" },
              { label: "GRIP", value: "4 items" },
            ].map((d) => (
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
        top: 0,
        zIndex: 50,
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
        <style>{`.eq-toolbar::-webkit-scrollbar { display: none; }`}</style>
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

function EqInventory({ activeFilter }: { activeFilter: FilterTab }) {
  const visibleCategories =
    activeFilter === "ALL"
      ? EQUIPMENT_DATA
      : EQUIPMENT_DATA.filter((c) => c.code === activeFilter);

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
            index={EQUIPMENT_DATA.indexOf(category)}
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
  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");

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
        <EqInventory activeFilter={activeFilter} />
      </div>
      <EqCantFindIt />
    </main>
  );
}
