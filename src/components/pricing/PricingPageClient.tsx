"use client";
import { useState } from "react";
import {
  HandwrittenWord,
  BrushUnderline,
  ScribbleArrowIcon,
  TapeStrip,
  SmileyFaceIcon,
  HandDrawnStarIcon,
  CircularBadgeSeal,
  kiddoColors,
} from "@/components/kiddo-assets";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  ADDONS,
  FAQ,
  PRICING_TIERS,
  WEEKEND_BADGE,
  WEEKEND_MULTIPLIER,
  tierDisplayPrice,
  tierUnit,
} from "@/data/pricing";
import { TICKET_THEMES } from "./ticketTheme";
import { formatRate } from "@/lib/money";


const monoXs: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

export default function PricingPageClient() {
  const isMobile = useIsMobile();
  const [billing, setBilling] = useState<"WEEKDAY" | "WEEKEND">("WEEKDAY");
  const mult = billing === "WEEKEND" ? WEEKEND_MULTIPLIER : 1;
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      {/* SECTION 1 — BILLBOARD HERO */}
      <section
        style={{
          background: kiddoColors.lime,
          position: "relative",
          overflow: "hidden",
          padding: isMobile ? "40px 0 64px" : "72px 0 100px",
        }}
      >
        {/* Watermark number */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -80,
            right: -40,
            fontFamily: "var(--font-display)",
            fontSize: 520,
            lineHeight: 0.8,
            color: "rgba(0,0,0,0.08)",
            pointerEvents: "none",
            letterSpacing: "-0.04em",
            userSelect: "none",
          }}
        >
          40€
        </span>

        {/* TapeStrip decoration */}
        <div
          style={{
            position: "absolute",
            top: 110,
            left: "44%",
            transform: "rotate(-6deg)",
          }}
        >
          <TapeStrip variant="black" width={120} />
        </div>

        <div className="kiddo-container" style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <span
              style={{
                ...monoXs,
                color: "rgba(0,0,0,0.6)",
              }}
            >
              PRICING
            </span>
            <span
              style={{
                width: 30,
                height: 1,
                background: kiddoColors.black,
                opacity: 0.5,
                display: "inline-block",
              }}
            />
            <span
              style={{
                ...monoXs,
                color: "rgba(0,0,0,0.6)",
              }}
            >
              FAIR · FLAT · NO SURPRISES
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(5rem,14vw,13.75rem)",
              lineHeight: 0.85,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              fontWeight: 400,
              margin: 0,
            }}
          >
            PAY FOR THE
            <br />
            <HandwrittenWord
              text="space."
              color={kiddoColors.black}
              fontSize="inherit"
              rotation={-3}
            />
            <br />
            NOT THE FLUFF.
          </h1>

          {/* Billing toggle */}
          <div
            style={{
              marginTop: 48,
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span style={{ ...monoXs, color: "rgba(0,0,0,0.6)" }}>
              I&apos;M BOOKING FOR A:
            </span>
            <div
              style={{
                display: "inline-flex",
                padding: 4,
                background: kiddoColors.black,
                borderRadius: 999,
              }}
            >
              {(["WEEKDAY", "WEEKEND"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    padding: "10px 18px",
                    borderRadius: 999,
                    background:
                      billing === b ? kiddoColors.lime : "transparent",
                    color: billing === b ? kiddoColors.black : "#fff",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
            {billing === "WEEKEND" && (
              <span
                style={{
                  ...monoXs,
                  background: "#111111",
                  color: kiddoColors.lime,
                  padding: "6px 10px",
                  border: `1px dashed ${kiddoColors.lime}`,
                }}
              >
                {WEEKEND_BADGE}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 2 — TICKETS */}
      <section style={{ padding: 0 }}>
        {PRICING_TIERS.map((t, i) => {
          const theme = TICKET_THEMES[t.id];
          const showPrice = tierDisplayPrice(t, mult);
          const subtle = theme.dark
            ? "rgba(255,255,255,0.6)"
            : "rgba(0,0,0,0.6)";
          const borderColor = theme.dark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.08)";

          return (
            <div
              key={t.id}
              style={{
                background: theme.bg,
                color: theme.text,
                borderTop: i === 0 ? "none" : `1px solid ${borderColor}`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                className="kiddo-container"
                style={{
                  padding: isMobile ? "20px 16px" : "56px 0",
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "auto 1fr auto",
                  gap: isMobile ? 16 : 48,
                  alignItems: "center",
                  position: "relative",
                }}
              >
                {/* Left: name + tag */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <span style={{ ...monoXs, color: subtle }}>
                    {String(i + 1).padStart(2, "0")} · {t.tag}
                  </span>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(3rem,6vw,5.75rem)",
                      lineHeight: 0.9,
                      color: theme.text,
                      fontWeight: 400,
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    {t.name}
                  </h3>
                  <span style={{ ...monoXs, color: subtle }}>{t.min}</span>
                  {t.featured && (
                    <HandwrittenWord
                      text="← pick me"
                      color={theme.text}
                      fontSize={30}
                      rotation={-3}
                    />
                  )}
                </div>

                {/* Center: GIANT price */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(6rem,18vw,17.5rem)",
                        lineHeight: 0.85,
                        letterSpacing: "-0.04em",
                        color: theme.text,
                        fontWeight: 400,
                      }}
                    >
                      {showPrice}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(2rem,4.5vw,4.375rem)",
                        lineHeight: 1,
                        color: theme.text,
                        marginTop: 28,
                        fontWeight: 400,
                      }}
                    >
                      {tierUnit(t.rate)}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, alignSelf: "center" }}>
                    <BrushUnderline
                      variant="short"
                      color={theme.accent}
                      width={160}
                    />
                  </div>
                </div>

                {/* Right: bullets + CTA */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    minWidth: isMobile ? 0 : 280,
                  }}
                >
                  <ul
                    style={{
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    {t.bullets.map((b) => (
                      <li
                        key={b}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          fontSize: 13,
                          color:
                            theme.dark
                              ? "rgba(255,255,255,0.75)"
                              : "rgba(0,0,0,0.7)",
                          lineHeight: 1.5,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 7,
                            width: 14,
                            height: 1,
                            background: theme.accent,
                            flexShrink: 0,
                          }}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="/booking"
                    style={{
                      marginTop: 10,
                      padding: "14px 22px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      background:
                        theme.limeAccent
                          ? kiddoColors.black
                          : kiddoColors.lime,
                      color:
                        theme.limeAccent
                          ? kiddoColors.lime
                          : kiddoColors.black,
                      border: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      textDecoration: "none",
                      cursor: "pointer",
                      alignSelf: "flex-start",
                    }}
                  >
                    {t.cta} <span>→</span>
                  </a>
                </div>

                {/* Decoration: BEST VALUE badge on full day */}
                {t.featured && (
                  <div
                    style={{
                      position: "absolute",
                      top: 20,
                      right: -10,
                      transform: "rotate(8deg)",
                    }}
                  >
                    <CircularBadgeSeal
                      size={110}
                      color={kiddoColors.black}
                      bgColor={kiddoColors.lime}
                      spinning
                    />
                  </div>
                )}
                {t.id === "md" && (
                  <div
                    style={{
                      position: "absolute",
                      top: 30,
                      right: 30,
                      opacity: 0.2,
                    }}
                  >
                    <HandDrawnStarIcon width={80} color={kiddoColors.lime} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* SECTION 3 — ADD-ONS receipt */}
      <section
        style={{
          background: kiddoColors.cream,
          padding: isMobile ? "56px 0" : "100px 0",
          position: "relative",
        }}
      >
        <div className="kiddo-container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 32,
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div>
              <p
                style={{
                  ...monoXs,
                  color: "rgba(0,0,0,0.45)",
                  marginBottom: 8,
                  margin: "0 0 8px 0",
                }}
              >
                ADD-ONS · PICK &amp; MIX
              </p>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(3rem,6vw,6rem)",
                  lineHeight: 0.95,
                  fontWeight: 400,
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                EXTRAS,{" "}
                <HandwrittenWord
                  text="if you want."
                  color={kiddoColors.lime}
                  fontSize="inherit"
                  rotation={-3}
                />
              </h2>
            </div>
          </div>

          {/* Receipt box */}
          <div
            style={{
              background: "#fff",
              border: `1px dashed ${kiddoColors.black}`,
              padding: 32,
              maxWidth: 720,
              marginInline: "auto",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: `1px dashed ${kiddoColors.black}`,
              }}
            >
              <span
                style={{ fontFamily: "var(--font-display)", fontSize: 18 }}
              >
                KIDDO STUDIO · ADD-ON MENU
              </span>
              <span style={{ ...monoXs, color: "rgba(0,0,0,0.4)" }}>
                REF 2026/11
              </span>
            </div>
            {ADDONS.map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 0",
                  borderBottom:
                    i < ADDONS.length - 1
                      ? "1px dotted rgba(0,0,0,0.2)"
                      : "none",
                }}
              >
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                  {a.label}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    color: "rgba(0,0,0,0.2)",
                    letterSpacing: 4,
                  }}
                >
                  · · · · · · · ·
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {formatRate(a.rate)}
                </span>
              </div>
            ))}
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: `1px dashed ${kiddoColors.black}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ ...monoXs, color: "rgba(0,0,0,0.5)" }}>
                VAT INCLUDED · INVOICED AFTER
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontStyle: "italic",
                  color: "rgba(0,0,0,0.4)",
                }}
              >
                thx for playing —
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — FAQ */}
      <section style={{ background: "#111111", padding: isMobile ? "56px 0" : "100px 0" }}>
        <div
          className="kiddo-container"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr",
            gap: isMobile ? 40 : 80,
          }}
        >
          <div>
            <p
              style={{
                ...monoXs,
                color: "rgba(255,255,255,0.45)",
                marginBottom: 12,
                margin: "0 0 12px 0",
              }}
            >
              FAQ — STUFF PEOPLE ASK
            </p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(3rem,6vw,6rem)",
                lineHeight: 0.95,
                color: "#fff",
                fontWeight: 400,
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              ASK{" "}
              <HandwrittenWord
                text="away"
                color={kiddoColors.lime}
                fontSize="inherit"
                rotation={-3}
              />
              .
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.55)",
                marginTop: 14,
                lineHeight: 1.7,
                maxWidth: 280,
              }}
            >
              Still curious? Ping us.
            </p>
          </div>
          <div>
            {FAQ.map((f, i) => (
              <div
                key={f.q}
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  padding: "20px 0",
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    textAlign: "left",
                    color: "#fff",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 24,
                      lineHeight: 1.1,
                      fontWeight: 400,
                    }}
                  >
                    {f.q}
                  </span>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background:
                        openFaq === i ? kiddoColors.lime : "transparent",
                      color: openFaq === i ? kiddoColors.black : "#fff",
                      border: `1.5px solid ${
                        openFaq === i
                          ? kiddoColors.lime
                          : "rgba(255,255,255,0.4)"
                      }`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 18,
                      fontWeight: 700,
                      transition: "all 0.2s",
                    }}
                  >
                    {openFaq === i ? "–" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <p
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,0.7)",
                      marginTop: 14,
                      lineHeight: 1.7,
                      maxWidth: 540,
                    }}
                  >
                    {f.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — FOOTER CTA */}
      <section
        style={{
          background: kiddoColors.lime,
          padding: isMobile ? "48px 0" : "80px 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 30,
            left: 60,
            transform: "rotate(-4deg)",
          }}
        >
          <TapeStrip variant="black" width={120} />
        </div>
        <div style={{ position: "absolute", bottom: 30, right: 60 }}>
          <SmileyFaceIcon
            variant="drip"
            width={90}
            fill={kiddoColors.black}
          />
        </div>
        <div
          className="kiddo-container"
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            alignItems: "center",
            position: "relative",
          }}
        >
          <p style={{ ...monoXs, color: "rgba(0,0,0,0.55)", margin: 0 }}>
            NO HIDDEN FEES · NO FINE PRINT · NO BS
          </p>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(4rem,9vw,8.75rem)",
              lineHeight: 0.9,
              fontWeight: 400,
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            THAT&apos;S THE WHOLE{" "}
            <HandwrittenWord
              text="list."
              color={kiddoColors.black}
              fontSize="inherit"
              rotation={-3}
            />
          </h2>
          <a
            href="/booking"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              background: kiddoColors.black,
              color: kiddoColors.lime,
              border: `1px solid ${kiddoColors.black}`,
              padding: "12px 22px",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginTop: 12,
              textDecoration: "none",
            }}
          >
            BOOK THE STUDIO{" "}
            <ScribbleArrowIcon
              variant="right"
              width={20}
              height={10}
              color={kiddoColors.lime}
            />
          </a>
        </div>
      </section>
    </>
  );
}
