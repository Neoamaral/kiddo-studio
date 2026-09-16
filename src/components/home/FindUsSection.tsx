"use client";

/**
 * The location band that sits directly above the footer on the home page.
 *
 * Home only, by request — the footer component itself is shared by every
 * route, and /contact already carries the full-size map.
 */

import {
  ScribbleArrowIcon,
  StudioMap,
  STUDIO_MAP_POINTS,
  kiddoColors,
} from "@/components/kiddo-assets";
import { useIsMobile } from "@/hooks/useIsMobile";

const MAPS_HREF = "https://maps.google.com/?q=Rua+Saudade+14+Lisboa";

export default function FindUsSection() {
  const isMobile = useIsMobile();

  return (
    <section style={{ background: kiddoColors.nearBlack, color: "#fff" }}>
      <div
        className="kiddo-container"
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(260px, 340px) 1fr",
          gap: isMobile ? 28 : 56,
          alignItems: "center",
          paddingTop: isMobile ? 48 : 72,
          paddingBottom: isMobile ? 48 : 72,
        }}
      >
        {/* Left: address and landmarks */}
        <div>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 12,
            }}
          >
            // FIND THE STUDIO
          </p>

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            RUA SAUDADE 14
          </h2>

          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              marginBottom: 24,
            }}
          >
            1100-321 Lisboa, Portugal
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 26,
              borderTop: "1px solid rgba(255,255,255,0.12)",
              paddingTop: 18,
            }}
          >
            {STUDIO_MAP_POINTS.map((point) => (
              <div key={point.n} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: kiddoColors.lime,
                    color: kiddoColors.black,
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {point.n}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.65)",
                    lineHeight: 1.3,
                  }}
                >
                  {point.label}
                </span>
              </div>
            ))}
          </div>

          <a
            href={MAPS_HREF}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontWeight: 700,
              background: kiddoColors.lime,
              color: kiddoColors.black,
              padding: "13px 22px",
              textDecoration: "none",
            }}
          >
            OPEN IN MAPS
            <ScribbleArrowIcon variant="diagonal" width={16} height={16} color={kiddoColors.black} />
          </a>
        </div>

        {/* Right: the map */}
        <div
          style={{
            position: "relative",
            aspectRatio: "16/9",
            border: `2px solid ${kiddoColors.black}`,
            overflow: "hidden",
          }}
        >
          <StudioMap />
        </div>
      </div>
    </section>
  );
}
