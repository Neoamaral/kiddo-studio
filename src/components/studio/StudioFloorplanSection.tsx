"use client";
import { HandwrittenWord, kiddoColors } from "@/components/kiddo-assets";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function StudioFloorplanSection() {
  const isMobile = useIsMobile();
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
              Loading bay on the east side. 3.6m clearance. Suitable for trucks,
              large set pieces, and equipment drops. Direct internal access to all
              four zones.
            </p>
          </div>
        </div>

        {/* SVG Floor Plan */}
        <div
          style={{
            background: "#F8F5EE",
            border: "1px solid rgba(0,0,0,0.1)",
            overflow: isMobile ? "auto" : "hidden",
            position: "relative",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties}
        >
          <svg
            viewBox="0 0 800 450"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", height: "100%", minWidth: isMobile ? 600 : undefined, display: "block", aspectRatio: "16/9" }}
          >
            {/* Grid pattern */}
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="rgba(0,0,0,0.06)"
                  strokeWidth="0.6"
                />
              </pattern>
            </defs>
            <rect width="800" height="450" fill="url(#grid)" />

            {/* Outer perimeter */}
            <rect
              x="40"
              y="40"
              width="720"
              height="370"
              stroke={kiddoColors.black}
              strokeWidth="3"
              fill="none"
            />

            {/* Room fills */}
            {/* Cyclorama — large left section */}
            <rect
              x="41"
              y="41"
              width="330"
              height="240"
              fill={`rgba(200,232,32,0.30)`}
            />
            {/* Black Box — top right */}
            <rect
              x="371"
              y="41"
              width="230"
              height="240"
              fill={`rgba(17,17,17,0.08)`}
            />
            {/* Creative Area — bottom right */}
            <rect
              x="371"
              y="281"
              width="230"
              height="129"
              fill={`rgba(255,255,255,0.5)`}
            />
            {/* Prop Room — bottom left */}
            <rect
              x="41"
              y="281"
              width="330"
              height="129"
              fill={`rgba(17,17,17,0.14)`}
            />

            {/* Room divider lines */}
            {/* Vertical center divider */}
            <line
              x1="371"
              y1="40"
              x2="371"
              y2="410"
              stroke={kiddoColors.black}
              strokeWidth="1.5"
            />
            {/* Horizontal divider */}
            <line
              x1="40"
              y1="281"
              x2="760"
              y2="281"
              stroke={kiddoColors.black}
              strokeWidth="1.5"
            />
            {/* Right section vertical — separating black box from corridor */}
            <line
              x1="601"
              y1="40"
              x2="601"
              y2="410"
              stroke={kiddoColors.black}
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />

            {/* Corridor / loading bay indicator */}
            <rect
              x="602"
              y="41"
              width="157"
              height="368"
              fill="rgba(26,26,26,0.04)"
            />

            {/* Room labels */}
            {/* Cyclorama */}
            <text
              x="206"
              y="140"
              fontFamily="'Arial', sans-serif"
              fontSize="9"
              fontWeight="700"
              fill="rgba(26,26,26,0.5)"
              textAnchor="middle"
              letterSpacing="3"
              textDecoration="none"
            >
              CYCLORAMA
            </text>
            <text
              x="206"
              y="155"
              fontFamily="'Arial', sans-serif"
              fontSize="8"
              fill="rgba(26,26,26,0.35)"
              textAnchor="middle"
              letterSpacing="2"
            >
              6M × 4M
            </text>
            <text
              x="206"
              y="168"
              fontFamily="'Arial', sans-serif"
              fontSize="7"
              fill="rgba(26,26,26,0.3)"
              textAnchor="middle"
              letterSpacing="2"
            >
              ZONE 01
            </text>

            {/* Black Box */}
            <text
              x="486"
              y="140"
              fontFamily="'Arial', sans-serif"
              fontSize="9"
              fontWeight="700"
              fill="rgba(26,26,26,0.45)"
              textAnchor="middle"
              letterSpacing="3"
            >
              BLACK BOX
            </text>
            <text
              x="486"
              y="155"
              fontFamily="'Arial', sans-serif"
              fontSize="8"
              fill="rgba(26,26,26,0.3)"
              textAnchor="middle"
              letterSpacing="2"
            >
              BLACKOUT
            </text>
            <text
              x="486"
              y="168"
              fontFamily="'Arial', sans-serif"
              fontSize="7"
              fill="rgba(26,26,26,0.25)"
              textAnchor="middle"
              letterSpacing="2"
            >
              ZONE 02
            </text>

            {/* Creative Area */}
            <text
              x="486"
              y="335"
              fontFamily="'Arial', sans-serif"
              fontSize="9"
              fontWeight="700"
              fill="rgba(26,26,26,0.5)"
              textAnchor="middle"
              letterSpacing="3"
            >
              CREATIVE
            </text>
            <text
              x="486"
              y="350"
              fontFamily="'Arial', sans-serif"
              fontSize="7"
              fill="rgba(26,26,26,0.3)"
              textAnchor="middle"
              letterSpacing="2"
            >
              ZONE 03
            </text>

            {/* Prop Room */}
            <text
              x="206"
              y="335"
              fontFamily="'Arial', sans-serif"
              fontSize="9"
              fontWeight="700"
              fill="rgba(26,26,26,0.5)"
              textAnchor="middle"
              letterSpacing="3"
            >
              PROP ROOM
            </text>
            <text
              x="206"
              y="350"
              fontFamily="'Arial', sans-serif"
              fontSize="7"
              fill="rgba(26,26,26,0.3)"
              textAnchor="middle"
              letterSpacing="2"
            >
              ZONE 04
            </text>

            {/* Loading bay label */}
            <text
              x="680"
              y="230"
              fontFamily="'Arial', sans-serif"
              fontSize="8"
              fill="rgba(26,26,26,0.4)"
              textAnchor="middle"
              letterSpacing="2"
              transform="rotate(-90, 680, 230)"
            >
              LOADING BAY
            </text>

            {/* Entrance dot — lime */}
            <circle cx="206" cy="409" r="7" fill={kiddoColors.lime} />
            <circle
              cx="206"
              cy="409"
              r="7"
              stroke={kiddoColors.black}
              strokeWidth="1.5"
              fill="none"
            />
            <text
              x="206"
              y="430"
              fontFamily="'Arial', sans-serif"
              fontSize="7"
              fill="rgba(26,26,26,0.5)"
              textAnchor="middle"
              letterSpacing="2"
            >
              ENTRANCE
            </text>

            {/* North compass */}
            <circle
              cx="740"
              cy="70"
              r="18"
              stroke={kiddoColors.black}
              strokeWidth="1.5"
              fill="rgba(248,245,238,0.9)"
            />
            <path
              d="M 740 56 L 745 68 L 740 64 L 735 68 Z"
              fill={kiddoColors.black}
            />
            <path
              d="M 740 84 L 745 72 L 740 76 L 735 72 Z"
              fill="rgba(26,26,26,0.25)"
            />
            <text
              x="740"
              y="60"
              fontFamily="'Arial', sans-serif"
              fontSize="7"
              fontWeight="700"
              fill={kiddoColors.black}
              textAnchor="middle"
            >
              N
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 20,
            flexWrap: "wrap",
          }}
        >
          {[
            { color: `rgba(200,232,32,0.5)`, label: "CYCLORAMA" },
            { color: `rgba(17,17,17,0.18)`, label: "BLACK BOX" },
            { color: `rgba(255,255,255,0.9)`, label: "CREATIVE AREA", border: true },
            { color: `rgba(17,17,17,0.25)`, label: "PROP ROOM" },
          ].map(({ color, label, border }) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: color,
                  border: border
                    ? "1px solid rgba(0,0,0,0.2)"
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
