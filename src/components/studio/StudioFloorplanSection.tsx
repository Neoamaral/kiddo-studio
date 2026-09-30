"use client";

/**
 * The floor plan.
 *
 * It used to be a hand-drawn SVG: a rectangle split into four, with a compass
 * rose and a "LOADING BAY" label. None of it matched the building — the rooms
 * were the wrong shapes, in the wrong places, and the copy claimed a 3.6m
 * clearance on a page whose own stat bar says the ceiling is 3.1m.
 *
 * It is the studio's surveyed drawing now, so the dimensions on it are real and
 * there is nothing to keep in sync by hand. The legend below is still markup
 * rather than part of the picture, so it stays legible when the image is
 * scaled down and is readable by a screen reader.
 */

import Image from "next/image";
import { HandwrittenWord, kiddoColors } from "@/components/kiddo-assets";

/**
 * Sampled from the drawing itself, so a swatch cannot drift from the area it
 * names. STUDIO & WORKING AREA is the paper showing through, which is why it
 * is the one with a border instead of a fill.
 */
const LEGEND: readonly { label: string; fill: string; outlined?: boolean }[] = [
  { label: "CYCLORAMA", fill: "#EBF5B0" },
  { label: "STUDIO & WORKING AREA", fill: "#FFFFFF", outlined: true },
  { label: "OFFICE", fill: "#D3D1CC" },
  { label: "CHILLING AREA", fill: "#EBE9E3" },
  { label: "MAKEUP & DRESSING", fill: "#BFBDB9" },
];

export default function StudioFloorplanSection() {
  return (
    <section
      style={{
        background: kiddoColors.cream,
        borderTop: "1px solid rgba(0,0,0,0.10)",
      }}
    >
      <div className="kiddo-container" style={{ paddingTop: 96, paddingBottom: 96 }}>
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 32,
            marginBottom: 56,
          }}
          className="floorplan-header-grid"
        >
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "rgba(26,26,26,0.5)",
                marginBottom: 16,
              }}
            >
              APPENDIX · LAYOUT
            </p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(48px, 6vw, 96px)",
                lineHeight: 0.9,
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
                fontWeight: 400,
                color: kiddoColors.black,
              }}
            >
              THE{" "}
              <HandwrittenWord
                text="floor plan."
                color={kiddoColors.lime}
                fontSize="0.8em"
                rotation={-1}
              />
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                letterSpacing: "0.05em",
                color: "rgba(26,26,26,0.55)",
                lineHeight: 1.7,
                maxWidth: 380,
              }}
            >
              {/*
                Every figure here is on the drawing. The old copy invented a
                3.6m loading-bay clearance, which the stat bar at the top of
                this page contradicted with a 3.1m ceiling.
              */}
              13.50 × 8.00 m of studio floor, with the cyclorama in the west
              corner and the makeup and dressing room off the far end. Step-free
              entry by ramp. Every room opens onto the studio.
            </p>
          </div>
        </div>

        {/* The drawing */}
        <div
          style={{
            background: "#FFFBF5",
            border: "1px solid rgba(0,0,0,0.1)",
            padding: "clamp(12px, 3vw, 32px)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Image
            src="/images/studio-floorplan.png"
            alt={
              "Floor plan of Kiddo Studio. The studio floor is 13.50 by 8.00 " +
              "metres, with a 3.71 by 3.15 metre cyclorama in the west corner, " +
              "a working area alongside it, and a 4.70 by 4.46 metre makeup and " +
              "dressing room at the east end. A chilling area sits between the " +
              "studio and the entrance, with a 6.50 by 4.15 metre office, a " +
              "restroom and a kitchenette off it. Entry is from the north " +
              "through a ramped entrance."
            }
            width={1024}
            height={1536}
            sizes="(min-width: 1024px) 760px, 100vw"
            style={{
              width: "100%",
              maxWidth: 760,
              height: "auto",
            }}
          />
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {LEGEND.map(({ label, fill, outlined }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: fill,
                  border: outlined
                    ? "1px solid rgba(0,0,0,0.3)"
                    : "1px solid rgba(0,0,0,0.1)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(26,26,26,0.5)",
                }}
              >
                {label}
              </span>
            </div>
          ))}

          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(26,26,26,0.4)",
            }}
          >
            Dimensions in metres
          </span>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .floorplan-header-grid {
            grid-template-columns: 1fr 1fr !important;
            align-items: flex-end;
          }
        }
      `}</style>
    </section>
  );
}
