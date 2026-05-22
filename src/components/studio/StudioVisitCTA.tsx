"use client";
import {
  HandwrittenWord,
  CircularBadgeSeal,
  SmallTextArrowLink,
  kiddoColors,
} from "@/components/kiddo-assets";

export default function StudioVisitCTA() {
  return (
    <section
      className="section-dark"
      style={{
        position: "relative",
        overflow: "hidden",
        paddingTop: 96,
        paddingBottom: 96,
      }}
    >
      {/* CircularBadgeSeal — top right */}
      <div
        style={{
          position: "absolute",
          top: 40,
          right: "clamp(1.25rem,4vw,5rem)",
          zIndex: 1,
        }}
      >
        <CircularBadgeSeal
          size={120}
          spinning
          color={kiddoColors.lime}
          bgColor={kiddoColors.nearBlack}
        />
      </div>

      <div
        className="kiddo-container"
        style={{ position: "relative", zIndex: 2 }}
      >
        {/* Label */}
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
            marginBottom: 24,
          }}
        >
          NEXT STEP — VISIT
        </p>

        {/* Headline */}
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(56px, 8vw, 110px)",
            lineHeight: 0.88,
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            fontWeight: 400,
            color: "#fff",
            marginBottom: 32,
            maxWidth: 800,
          }}
        >
          COME SEE IT{" "}
          <HandwrittenWord
            text="irl."
            color={kiddoColors.lime}
            fontSize="0.78em"
            rotation={-2}
          />
        </h2>

        {/* Body */}
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 16,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.7,
            maxWidth: 460,
            marginBottom: 40,
          }}
        >
          Nothing beats walking through it. Book a free 30-minute visit and see
          all four spaces before committing to a date. No pressure, no invoice.
        </p>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 28,
          }}
        >
          <a
            href="/booking"
            style={{
              display: "inline-block",
              background: kiddoColors.lime,
              color: kiddoColors.black,
              padding: "14px 32px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            BOOK A VISIT →
          </a>

          <SmallTextArrowLink
            label="OR CALL US"
            href="tel:+351000000000"
            color="rgba(255,255,255,0.7)"
            underlineColor={kiddoColors.lime}
          />
        </div>
      </div>
    </section>
  );
}
