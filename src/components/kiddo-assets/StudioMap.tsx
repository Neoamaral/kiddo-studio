"use client";

/**
 * Hand-drawn location map for the studio.
 *
 * Modelled on the studio's own illustrated map — same streets, same four
 * landmarks, same lime avenue cutting across — but redrawn as SVG in the site's
 * palette and fonts, so it scales, stays crisp at any size, and can be
 * restyled without going back to an image editor.
 *
 * Every coordinate here is a literal. Nothing is randomised: this renders
 * during SSR, and a randomised layout would differ between server and client
 * and trip a hydration mismatch.
 */

import { kiddoColors } from "./kiddoColors";

export interface MapPoint {
  n: number;
  label: string;
  icon: "parking" | "hardware" | "cafe" | "shop";
  /** Badge centre, in viewBox units. */
  x: number;
  y: number;
  /** Dashed route from the studio pin to this badge. */
  path: string;
}

export const STUDIO_MAP_POINTS: readonly MapPoint[] = [
  {
    n: 1,
    label: "PARKING",
    icon: "parking",
    x: 352,
    y: 128,
    path: "M 578 300 C 520 250 424 214 372 180",
  },
  {
    n: 2,
    label: "HARDWARE STORE",
    icon: "hardware",
    x: 700,
    y: 112,
    path: "M 612 268 C 630 212 664 176 694 162",
  },
  {
    n: 3,
    label: "CAFE",
    icon: "cafe",
    x: 872,
    y: 306,
    path: "M 644 306 C 712 294 788 298 822 304",
  },
  {
    n: 4,
    label: "ALDI",
    icon: "shop",
    x: 748,
    y: 556,
    path: "M 612 332 C 624 428 676 490 712 524",
  },
];

/* ── Static geometry ─────────────────────────────────────────────────────── */

/** [x, y, w, h, rotation] — city blocks. */
const BUILDINGS: [number, number, number, number, number][] = [
  [60, 56, 96, 52, 0],
  [178, 40, 74, 62, 0],
  [274, 26, 118, 44, 0],
  [420, 32, 66, 58, 0],
  [512, 20, 92, 48, 0],
  [630, 36, 58, 54, 0],
  [780, 24, 104, 44, 0],
  [906, 32, 78, 56, 0],
  [1010, 50, 96, 46, 0],
  [72, 168, 88, 44, -4],
  [196, 150, 64, 70, 0],
  [300, 156, 92, 40, 0],
  [452, 150, 70, 62, 0],
  [560, 146, 72, 44, 0],
  [780, 158, 62, 58, 0],
  [906, 150, 92, 48, 0],
  [1022, 166, 66, 54, 0],
  [30, 598, 96, 46, 6],
  [186, 380, 72, 56, 0],
  [316, 300, 88, 42, 0],
  [462, 296, 48, 50, 0],
  [704, 372, 64, 46, 0],
  [962, 292, 84, 52, 0],
  [86, 420, 92, 50, -3],
  [286, 410, 78, 60, 0],
  [452, 444, 92, 44, 0],
  [576, 314, 62, 62, 0],
  [830, 418, 74, 58, 0],
  [934, 430, 96, 44, 0],
  [150, 540, 106, 48, 0],
  [300, 552, 84, 54, 0],
  [452, 542, 92, 44, 0],
  [592, 556, 72, 50, 0],
  [886, 548, 90, 46, 0],
  [1006, 536, 80, 56, 0],
];

/** Street centrelines. Drawn as a black casing with a paper-coloured roadway. */
const STREETS: string[] = [
  "M 0 132 L 1200 108",
  "M 0 250 L 1200 236",
  "M 0 376 L 1200 368",
  "M 0 498 L 1200 506",
  "M 168 0 L 150 675",
  "M 410 0 L 424 675",
  "M 668 0 L 656 675",
  "M 848 0 L 864 675",
  "M 1062 0 L 1048 675",
];

const PARKS: string[] = [
  "M 0 286 L 92 274 L 120 330 L 46 366 L 0 350 Z",
  "M 1112 150 L 1200 138 L 1200 340 L 1120 322 Z",
  "M 1096 430 L 1200 414 L 1200 620 L 1104 596 Z",
];

/** Tree dots inside the parks. */
const TREES: [number, number, number][] = [
  [34, 312, 9],
  [70, 296, 7],
  [58, 338, 8],
  [1148, 182, 9],
  [1176, 226, 7],
  [1140, 268, 8],
  [1174, 306, 7],
  [1140, 462, 9],
  [1174, 500, 7],
  [1136, 546, 8],
  [1172, 582, 7],
];

function PointIcon({ kind }: { kind: MapPoint["icon"] }) {
  const stroke = {
    stroke: kiddoColors.black,
    strokeWidth: 2.4,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (kind === "parking") {
    return (
      <text
        textAnchor="middle"
        y="9"
        fontFamily="var(--font-display), sans-serif"
        fontSize="30"
        fill={kiddoColors.black}
      >
        P
      </text>
    );
  }
  if (kind === "hardware") {
    // Crossed wrench and hammer.
    return (
      <g {...stroke}>
        <path d="M -10 10 L 3 -3" />
        <path d="M 2 -8 a 5.5 5.5 0 1 0 6.5 6.5 L 3.5 -2.5 Z" />
        <path d="M 10 10 L -1 -1" />
        <path d="M -9 -10 L -2 -10 L -2 -3.5 L -9 -3.5 Z" />
      </g>
    );
  }
  if (kind === "cafe") {
    return (
      <g {...stroke}>
        {/* cup */}
        <path d="M -13 -6 L -2 -6 L -2 2 a 5.5 5.5 0 0 1 -11 0 Z" />
        <path d="M -2 -3 a 4.5 4.5 0 0 1 0 7" />
        {/* fork */}
        <path d="M 6 -10 L 6 -3" />
        <path d="M 11 -10 L 11 -3" />
        <path d="M 5 -3 L 12 -3" />
        <path d="M 8.5 -3 L 8.5 10" />
      </g>
    );
  }
  // Shopping trolley.
  return (
    <g {...stroke}>
      <path d="M -11 -7 L -7 -7 L -4 4 L 8 4" />
      <path d="M -5 -3 L 11 -3 L 8.5 4" />
      <circle cx="-2" cy="8.5" r="1.9" fill={kiddoColors.black} />
      <circle cx="7" cy="8.5" r="1.9" fill={kiddoColors.black} />
    </g>
  );
}

export interface StudioMapProps {
  /** Small mono caption, bottom-left. */
  caption?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function StudioMap({ caption, className = "", style }: StudioMapProps) {
  return (
    <svg
      viewBox="0 0 1200 675"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Illustrated map of the studio and its surroundings: parking, a hardware store, a cafe and a supermarket are all within a short walk."
      className={className}
      style={{ display: "block", ...style }}
    >
      <defs>
        <pattern id="km-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="rgba(26,26,26,0.10)" />
        </pattern>
        <filter id="km-shadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.3)" />
        </filter>
      </defs>

      {/* Paper */}
      <rect width="1200" height="675" fill={kiddoColors.offWhite} />
      <rect width="1200" height="675" fill="url(#km-dots)" />

      {/* Green space */}
      {PARKS.map((d, i) => (
        <path
          key={`park-${i}`}
          d={d}
          fill="rgba(200,232,32,0.45)"
          stroke={kiddoColors.black}
          strokeWidth="2"
        />
      ))}
      {TREES.map(([cx, cy, r], i) => (
        <circle key={`tree-${i}`} cx={cx} cy={cy} r={r} fill="rgba(26,26,26,0.32)" />
      ))}

      {/* Streets */}
      {STREETS.map((d, i) => (
        <path
          key={`casing-${i}`}
          d={d}
          stroke={kiddoColors.black}
          strokeWidth="20"
          fill="none"
          strokeLinecap="round"
        />
      ))}
      {STREETS.map((d, i) => (
        <path
          key={`road-${i}`}
          d={d}
          stroke={kiddoColors.offWhite}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
        />
      ))}

      {/* Blocks */}
      {BUILDINGS.map(([x, y, w, h, rot], i) => (
        <rect
          key={`b-${i}`}
          x={x}
          y={y}
          width={w}
          height={h}
          rx="3"
          transform={rot ? `rotate(${rot} ${x + w / 2} ${y + h / 2})` : undefined}
          fill="rgba(26,26,26,0.13)"
          stroke={kiddoColors.black}
          strokeWidth="2"
        />
      ))}

      {/* The avenue, and the roundabout it runs through */}
      <path d="M -20 208 L 1220 636" stroke={kiddoColors.black} strokeWidth="46" fill="none" />
      <path d="M -20 208 L 1220 636" stroke={kiddoColors.lime} strokeWidth="34" fill="none" />
      <path
        d="M -20 208 L 1220 636"
        stroke={kiddoColors.black}
        strokeWidth="2.5"
        strokeDasharray="14 12"
        fill="none"
      />
      <circle cx="248" cy="300" r="42" fill={kiddoColors.lime} stroke={kiddoColors.black} strokeWidth="6" />
      <circle cx="248" cy="300" r="17" fill={kiddoColors.black} />

      {/* Routes from the studio to each landmark */}
      {STUDIO_MAP_POINTS.map((p) => (
        <path
          key={`route-${p.n}`}
          d={p.path}
          fill="none"
          stroke={kiddoColors.black}
          strokeWidth="3"
          strokeDasharray="9 9"
          strokeLinecap="round"
        />
      ))}

      {/* Landmarks */}
      {STUDIO_MAP_POINTS.map((p) => {
        const words = p.label.split(" ");
        const twoLine = words.length > 1;
        return (
          <g key={p.n} transform={`translate(${p.x} ${p.y})`}>
            <circle r="46" fill="#fff" stroke={kiddoColors.black} strokeWidth="5" />
            <g transform="translate(0 -8)">
              <PointIcon kind={p.icon} />
            </g>
            <text
              textAnchor="middle"
              y={twoLine ? 18 : 26}
              fontFamily="var(--font-display), sans-serif"
              fontSize="17"
              letterSpacing="0.6"
              fill={kiddoColors.black}
            >
              {twoLine ? words[0] : p.label}
            </text>
            {twoLine && (
              <text
                textAnchor="middle"
                y="34"
                fontFamily="var(--font-display), sans-serif"
                fontSize="17"
                letterSpacing="0.6"
                fill={kiddoColors.black}
              >
                {words.slice(1).join(" ")}
              </text>
            )}
            <g transform="translate(-32 -34)">
              <circle r="16" fill={kiddoColors.lime} stroke={kiddoColors.black} strokeWidth="4" />
              <text
                textAnchor="middle"
                y="7"
                fontFamily="var(--font-display), sans-serif"
                fontSize="21"
                fill={kiddoColors.black}
              >
                {p.n}
              </text>
            </g>
          </g>
        );
      })}

      {/* The studio. Label sits above the pin so the drop stays readable. */}
      <g transform="translate(596 246)" filter="url(#km-shadow)">
        <path
          d="M 0 74 C 0 74 -30 40 -30 18 A 30 30 0 1 1 30 18 C 30 40 0 74 0 74 Z"
          fill={kiddoColors.lime}
          stroke={kiddoColors.black}
          strokeWidth="5"
        />
        <circle cx="0" cy="18" r="10" fill={kiddoColors.black} />

        <g transform="translate(0 -70)">
          <rect
            x="-62"
            y="-32"
            width="124"
            height="58"
            rx="8"
            fill={kiddoColors.black}
          />
          <text
            textAnchor="middle"
            y="-9"
            fontFamily="var(--font-display), sans-serif"
            fontSize="23"
            letterSpacing="1"
            fill="#fff"
          >
            KIDDO
          </text>
          <text
            textAnchor="middle"
            y="15"
            fontFamily="var(--font-display), sans-serif"
            fontSize="23"
            letterSpacing="1"
            fill={kiddoColors.lime}
          >
            STUDIO
          </text>
        </g>
      </g>

      {caption && (
        // Sits on a paper chip: without it the caption runs across a street
        // casing and becomes unreadable.
        <g transform="translate(22 622)">
          <rect
            x="-8"
            y="-20"
            width={caption.length * 9.6 + 24}
            height="34"
            rx="4"
            fill={kiddoColors.offWhite}
            stroke="rgba(26,26,26,0.18)"
            strokeWidth="1.5"
          />
          <text
            fontFamily="var(--font-mono), monospace"
            fontSize="14"
            letterSpacing="2"
            fill="rgba(26,26,26,0.62)"
          >
            {caption}
          </text>
        </g>
      )}
    </svg>
  );
}
