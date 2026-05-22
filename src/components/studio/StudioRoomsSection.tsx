"use client";
import {
  HandwrittenWord,
  TapeStrip,
  CollagePhotoFrame,
  HandDrawnStarIcon,
  SmallTextArrowLink,
  kiddoColors,
} from "@/components/kiddo-assets";

/* ─── Data ──────────────────────────────────────────────────────────────── */

type RoomSpec = [string, string];

interface Room {
  id: string;
  num: string;
  code: string;
  label: string;
  headline: string;
  handword: string;
  desc: string;
  specs: RoomSpec[];
  src: string;
  price: string;
  bg: string;
  accent: string;
  dark: boolean;
  layout:
    | "image-right-tall"
    | "image-fullbleed-overlay"
    | "image-left"
    | "image-grid";
}

const ROOMS: Room[] = [
  {
    id: "cyc",
    num: "01",
    code: "I",
    label: "CYCLORAMA",
    headline: "INFINITE",
    handword: "white.",
    desc: "Seamless 6×4m cyclorama wall. Floor-to-ceiling curve. Drive a car in if you want.",
    specs: [
      ["WALL", "6m × 4m"],
      ["CEILING", "3.2m"],
      ["LIGHT", "Mixed"],
      ["ACCESS", "Drive-in"],
    ],
    src: "/images/space-cyclorama.jpg",
    price: "FROM 280€/DAY",
    bg: "#fff",
    accent: kiddoColors.lime,
    dark: false,
    layout: "image-right-tall",
  },
  {
    id: "blk",
    num: "02",
    code: "II",
    label: "BLACK BOX",
    headline: "DARK.",
    handword: "controlled.",
    desc: "Fully black-out space for moody, controlled lighting. UV-ready. Smoke-ready.",
    specs: [
      ["WALLS", "Blackout"],
      ["UV RIG", "Yes"],
      ["SMOKE", "OK"],
      ["SOUND", "5.1 mon"],
    ],
    src: "/images/space-black-box.jpg",
    price: "FROM 320€/DAY",
    bg: "#111111",
    accent: kiddoColors.lime,
    dark: true,
    layout: "image-fullbleed-overlay",
  },
  {
    id: "crv",
    num: "03",
    code: "III",
    label: "CREATIVE AREA",
    headline: "MESSY IDEAS,",
    handword: "welcome.",
    desc: "Warm corner with a leather sofa, art wall, and good light.",
    specs: [
      ["SOFA", "Real leather"],
      ["LIGHT", "Side daylight"],
      ["WIFI", "Fast"],
      ["COFFEE", "Yes"],
    ],
    src: "/images/space-creative.jpg",
    price: "INCLUDED W/ RENTAL",
    bg: kiddoColors.lime,
    accent: kiddoColors.black,
    dark: false,
    layout: "image-left",
  },
  {
    id: "prp",
    num: "04",
    code: "IV",
    label: "PROP ROOM",
    headline: "BUILD",
    handword: "anything.",
    desc: "Ladders, plinths, fabrics, furniture, gels.",
    specs: [
      ["PROPS", "200+ items"],
      ["WORKSHOP", "Yes"],
      ["FLATS", "8 large"],
      ["RAIL", "Wardrobe"],
    ],
    src: "/images/space-prop-room.jpg",
    price: "BROWSE FREE",
    bg: kiddoColors.cream,
    accent: kiddoColors.black,
    dark: false,
    layout: "image-grid",
  },
];

/* ─── Shared sub-components ─────────────────────────────────────────────── */

function RoomHeader({ room, textColor }: { room: Room; textColor: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 20,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 72,
          lineHeight: 1,
          color: room.accent,
          letterSpacing: "-0.02em",
        }}
      >
        {room.code}
      </span>

      <div
        style={{
          width: 1,
          height: 60,
          background: textColor,
          opacity: 0.3,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: textColor,
            opacity: 0.55,
          }}
        >
          ROOM {room.num} OF 04
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: textColor,
          }}
        >
          {room.label}
        </span>
      </div>

      {/* Price tag */}
      <div
        style={{
          marginLeft: "auto",
          background: room.accent,
          color: kiddoColors.black,
          padding: "6px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {room.price}
      </div>
    </div>
  );
}

function RoomHeadline({ room, textColor }: { room: Room; textColor: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(64px, 9vw, 140px)",
          lineHeight: 0.85,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
          fontWeight: 400,
          color: textColor,
          display: "block",
        }}
      >
        {room.headline}{" "}
        <HandwrittenWord
          text={room.handword}
          color={room.accent}
          fontSize="0.75em"
          rotation={-3}
        />
      </span>
    </div>
  );
}

function RoomBody({ room, textColor }: { room: Room; textColor: string }) {
  const subtleColor = room.dark
    ? "rgba(255,255,255,0.6)"
    : "rgba(26,26,26,0.6)";
  const dividerColor = room.dark
    ? "rgba(255,255,255,0.15)"
    : "rgba(0,0,0,0.15)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <p
        style={{
          fontSize: 16,
          color: subtleColor,
          maxWidth: 460,
          lineHeight: 1.65,
          fontFamily: "var(--font-body)",
        }}
      >
        {room.desc}
      </p>

      {/* Specs 2×2 grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          maxWidth: 400,
        }}
      >
        {room.specs.map(([label, value]) => (
          <div
            key={label}
            style={{
              borderTop: `1px solid ${dividerColor}`,
              padding: "10px 12px 10px 0",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: subtleColor,
                marginBottom: 4,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 13,
                color: textColor,
                fontFamily: "var(--font-body)",
                fontWeight: 600,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <SmallTextArrowLink
        label="BOOK THIS SPACE"
        href="/booking"
        color={textColor}
        underlineColor={room.accent}
      />
    </div>
  );
}

/* ─── Layout variants ────────────────────────────────────────────────────── */

function RoomImageRightTall({ room }: { room: Room }) {
  const textColor = kiddoColors.black;
  return (
    <section
      style={{ background: room.bg, borderTop: "1px solid rgba(0,0,0,0.08)" }}
    >
      <div
        className="kiddo-container room-grid-right"
        style={{ paddingTop: 80, paddingBottom: 80 }}
      >
        {/* Left content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <RoomHeader room={room} textColor={textColor} />
          <RoomHeadline room={room} textColor={textColor} />
          <RoomBody room={room} textColor={textColor} />
        </div>

        {/* Right image */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: -14, left: 24, zIndex: 2 }}>
            <TapeStrip variant="black" width={160} height={28} rotation={-3} />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={room.src}
            alt={room.label}
            style={{
              width: "100%",
              aspectRatio: "3/4",
              objectFit: "cover",
              display: "block",
            }}
          />
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(26,26,26,0.45)",
              marginTop: 10,
            }}
          >
            FIG. 01 · CYCLORAMA
          </p>
        </div>
      </div>
    </section>
  );
}

function RoomImageFullbleedOverlay({ room }: { room: Room }) {
  const textColor = "#fff";
  return (
    <section
      style={{
        background: room.bg,
        minHeight: 640,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Full-bleed image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={room.src}
        alt={room.label}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.6)",
          zIndex: 0,
        }}
      />

      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right,rgba(17,17,17,0.85) 0%,rgba(17,17,17,0.35) 100%)",
          zIndex: 1,
        }}
      />

      <div
        className="kiddo-container"
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          minHeight: 640,
          paddingTop: 80,
          paddingBottom: 80,
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <RoomHeader room={room} textColor={textColor} />
          <RoomHeadline room={room} textColor={textColor} />
          <RoomBody room={room} textColor={textColor} />
        </div>

        {/* Decorative vertical text */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            writingMode: "vertical-rl",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          UV · SMOKE · BLACKOUT
        </div>
      </div>
    </section>
  );
}

function RoomImageLeft({ room }: { room: Room }) {
  const textColor = kiddoColors.black;
  return (
    <section
      style={{
        background: room.bg,
        borderTop: `2px solid ${kiddoColors.black}`,
        borderBottom: `2px solid ${kiddoColors.black}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Star decoration */}
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 40,
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <HandDrawnStarIcon width={72} height={72} color={kiddoColors.black} />
      </div>

      <div
        className="kiddo-container room-grid-left"
        style={{ paddingTop: 80, paddingBottom: 80 }}
      >
        {/* Left: collage photo */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <CollagePhotoFrame
            src={room.src}
            alt={room.label}
            rotation={-2}
            width={380}
            height={440}
            tape="corner"
            tapeColor="black"
          />
        </div>

        {/* Right content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <RoomHeader room={room} textColor={textColor} />
          <RoomHeadline room={room} textColor={textColor} />
          <RoomBody room={room} textColor={textColor} />
        </div>
      </div>
    </section>
  );
}

function RoomImageGrid({ room }: { room: Room }) {
  const textColor = kiddoColors.black;
  return (
    <section
      style={{
        background: room.bg,
        borderTop: "1px solid rgba(0,0,0,0.12)",
      }}
    >
      <div
        className="kiddo-container room-grid-split"
        style={{ paddingTop: 80, paddingBottom: 80 }}
      >
        {/* Left content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <RoomHeader room={room} textColor={textColor} />
          <RoomHeadline room={room} textColor={textColor} />
          <RoomBody room={room} textColor={textColor} />
        </div>

        {/* Right: image grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: 6,
            height: 420,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={room.src}
            alt={room.label}
            style={{
              gridRow: "span 2",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/art-collage.jpg"
            alt="Art collage"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/studio-filmstrip.jpg"
            alt="Studio filmstrip"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
      </div>
    </section>
  );
}

/* ─── Export ─────────────────────────────────────────────────────────────── */

export default function StudioRoomsSection() {
  return (
    <>
      {ROOMS.map((room) => {
        if (room.layout === "image-right-tall")
          return <RoomImageRightTall key={room.id} room={room} />;
        if (room.layout === "image-fullbleed-overlay")
          return <RoomImageFullbleedOverlay key={room.id} room={room} />;
        if (room.layout === "image-left")
          return <RoomImageLeft key={room.id} room={room} />;
        if (room.layout === "image-grid")
          return <RoomImageGrid key={room.id} room={room} />;
        return null;
      })}

      <style>{`
        .room-grid-right {
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
          align-items: center;
        }
        .room-grid-left {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px;
          align-items: center;
        }
        .room-grid-split {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px;
          align-items: center;
        }
        @media (min-width: 1024px) {
          .room-grid-right {
            grid-template-columns: 1.2fr 1fr;
            gap: 64px;
          }
          .room-grid-left {
            grid-template-columns: 1fr 1.1fr;
            gap: 56px;
          }
          .room-grid-split {
            grid-template-columns: 1fr 1fr;
            gap: 56px;
          }
        }
      `}</style>
    </>
  );
}
