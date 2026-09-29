"use client";
import { kiddoColors } from "@/components/kiddo-assets";

/**
 * "3.1", not "3,1". The site is written in English throughout — 180 M², 24/7 —
 * and a decimal comma in the middle of that reads as a typo rather than as
 * localisation.
 *
 * The loading bay is not a new claim: the floorplan section already says
 * "Loading bay on the east side. 3.6m clearance." This surfaces it.
 */
const STATS = [
  ["TOTAL", "180 M²"],
  ["CEILING", "3.1 M"],
  ["ACCESS", "24/7"],
  ["UNLOADING & LOADING", "DEDICATED AREA"],
];

export default function StudioCoverSection() {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100svh",
        background: kiddoColors.nearBlack,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-camera.jpg"
        alt="Kiddo Studio"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "grayscale(60%) brightness(0.55) contrast(1.15)",
          zIndex: 0,
        }}
      />

      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.1) 40%,rgba(0,0,0,0.7) 100%)",
          zIndex: 1,
        }}
      />

      {/* Top bar */}
      <div
        className="kiddo-container"
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 24,
          paddingBottom: 24,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          KIDDO · ISSUE 04 — THE STUDIO
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          LISBON — PORTUGAL
        </span>
      </div>

      {/* Main content — grows to fill space */}
      <div
        className="kiddo-container"
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          flex: 1,
          display: "flex",
          alignItems: "flex-end",
          paddingBottom: 48,
        }}
      >
        <div style={{ width: "100%", maxWidth: 620 }}>
          {/*
            This label is now the page's <h1>.

            The display headline that used to sit below it was the ONLY h1 on
            /studio, so deleting it outright would have left the page with no
            level-one heading at all. This line already says what the page is,
            which is an h1's whole job — it just keeps its small mono styling.
          */}
          <h1
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 20,
              fontWeight: 400,
            }}
          >
            THE STUDIO · A TOUR OF THE ROOMS
          </h1>

          {/* One column, not the old 1.4fr/1fr split: with the headline gone
              the left track held a 9px label against a full paragraph. */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.2)",
              paddingTop: 24,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              alignItems: "flex-start",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                letterSpacing: "0.05em",
                color: "rgba(255,255,255,0.75)",
                lineHeight: 1.7,
              }}
            >
              180 m² of raw creative space. Distinct environments under one roof
              in Lisbon. Each room is built for a different kind of work — and
              all are yours to command.
            </p>
            <a
              href="/booking"
              style={{
                display: "inline-block",
                background: kiddoColors.lime,
                color: kiddoColors.black,
                border: `2px solid ${kiddoColors.black}`,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                padding: "12px 24px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              BOOK A VISIT →
            </a>
          </div>
        </div>
      </div>

      {/* Bottom stats strip */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          background: kiddoColors.lime,
          color: kiddoColors.black,
          borderTop: `2px solid ${kiddoColors.black}`,
        }}
      >
        <div
          className="kiddo-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            overflowX: "auto",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
            gap: 0,
          }}
        >
          {STATS.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "16px 20px",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  opacity: 0.6,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  letterSpacing: "-0.01em",
                  lineHeight: 1,
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
