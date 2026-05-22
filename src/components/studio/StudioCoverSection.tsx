"use client";
import { HandwrittenWord, kiddoColors } from "@/components/kiddo-assets";

const STATS = [
  ["TOTAL", "420 M²"],
  ["CEILING", "3.2 M"],
  ["ZONES", "4"],
  ["ACCESS", "24/7"],
  ["PARKING", "ON-SITE"],
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
          flex: 1,
          display: "flex",
          alignItems: "flex-end",
          paddingBottom: 48,
        }}
      >
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 40,
          }}
          className="lg:grid-cover-cols"
        >
          {/* Left: headline */}
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.6)",
                marginBottom: 16,
              }}
            >
              THE STUDIO · A TOUR IN FOUR ROOMS
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.01em",
                lineHeight: 0.85,
                textTransform: "uppercase",
                fontWeight: 400,
                fontSize: "clamp(72px, 12vw, 180px)",
                color: "#fff",
              }}
            >
              FOUR
              <br />
              WORLDS.
              <br />
              <HandwrittenWord
                text="one roof."
                color={kiddoColors.lime}
                fontSize="0.72em"
                rotation={-2}
              />
            </h1>
          </div>

          {/* Right: description + CTA */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.2)",
              paddingTop: 24,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              maxWidth: 460,
            }}
            className="lg:max-w-none"
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                letterSpacing: "0.05em",
                color: "rgba(255,255,255,0.75)",
                lineHeight: 1.7,
              }}
            >
              420 m² of raw creative space. Four distinct environments under one
              roof in Lisbon. Each room is built for a different kind of work —
              and all are yours to command.
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
                alignSelf: "flex-start",
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

      <style>{`
        @media (min-width: 1024px) {
          .lg\\:grid-cover-cols {
            grid-template-columns: 1.4fr 1fr !important;
            align-items: flex-end;
          }
        }
      `}</style>
    </section>
  );
}
