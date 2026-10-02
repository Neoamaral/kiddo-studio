"use client";
import { useState } from "react";
import {
  HandwrittenWord,
  BrushUnderline,
  ScribbleArrowIcon,
  TapeStrip,
  SmileyFaceIcon,
  CircularBadgeSeal,
  kiddoColors,
} from "@/components/kiddo-assets";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { PricingView } from "@/data/pricing";
import { entryPrice } from "@/data/pricing";
import { TICKET_THEMES } from "./ticketTheme";
import BaseHireTourModal from "./BaseHireTourModal";
import { BASE_HIRE_PHOTO_COUNT } from "./baseHireTour";
import { formatRate } from "@/lib/money";


const monoXs: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

export default function PricingPageClient({ pricing }: { pricing: PricingView }) {
  // The Base Hire photo tour. One flag for the page, not one per ticket:
  // only the Base Hire ticket opens it, and the photos are its kit.
  const [tourOpen, setTourOpen] = useState(false);
  // Everything below used to be read from module-level constants. It now
  // arrives as a prop, because the rate card is editable and a build-time
  // import would show whatever was true when the site was last deployed.
  const {
    packages: PACKAGES,
    addons: ADDONS,
    faq: FAQ,
    durationById: DURATION_BY_ID,
    overtime: OVERTIME,
    studioDay: STUDIO_DAY,
    weekendBadge: WEEKEND_BADGE,
    weekendMultiplier: WEEKEND_MULTIPLIER,
  } = pricing;

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
          {entryPrice(PACKAGES)}€
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
        {PACKAGES.map((t, i) => {
          const theme = TICKET_THEMES[t.id];
          // Both prices move together under the weekend toggle: the surcharge
          // is on studio time, and both durations are studio time.
          const fullDay = Math.round(t.rates.fd * mult);
          const halfDay = Math.round(t.rates.hd * mult);
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
                  // padding-BLOCK only. The `padding: 56px 0` shorthand that
                  // used to be here zeroed .kiddo-container's own
                  // padding-inline, so at 1440 (exactly its max-width) the
                  // package name sat flush against the viewport edge.
                  paddingBlock: isMobile ? 20 : 56,
                  display: "grid",
                  // minmax(0,…) on every track: with bare `auto`/`1fr` the
                  // giant price refused to shrink and pushed the package name
                  // out through the container's own padding, so "BASE HIRE"
                  // sat flush against the viewport edge.
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "minmax(0,auto) minmax(0,1fr) minmax(0,auto)",
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
                      fontSize: "clamp(2.2rem,4.4vw,4.2rem)",
                      lineHeight: 0.9,
                      color: theme.text,
                      fontWeight: 400,
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    {t.name}
                  </h3>
                  <span style={{ ...monoXs, color: subtle }}>
                    {DURATION_BY_ID.fd.hours}H DAY · {DURATION_BY_ID.hd.hours}H HALF
                  </span>
                  {t.featured && (
                    <HandwrittenWord
                      text="← pick me"
                      color={theme.text}
                      fontSize={30}
                      rotation={-3}
                    />
                  )}
                </div>

                {/* Center: the two prices.
                    Full day giant, half day beneath it — a package has two
                    prices now, and showing only one would mean the client
                    discovers the other at checkout. */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <span style={{ ...monoXs, color: subtle }}>
                    {DURATION_BY_ID.fd.label}
                  </span>
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
                        fontSize: "clamp(4rem,11vw,10rem)",
                        lineHeight: 0.85,
                        letterSpacing: "-0.04em",
                        color: theme.text,
                        fontWeight: 400,
                      }}
                    >
                      {fullDay}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(2rem,4.5vw,4.375rem)",
                        lineHeight: 1,
                        color: theme.text,
                        marginTop: 24,
                        fontWeight: 400,
                      }}
                    >
                      €
                    </span>
                  </div>
                  <div style={{ marginTop: 4, alignSelf: "center" }}>
                    <BrushUnderline
                      variant="short"
                      color={theme.accent}
                      width={160}
                    />
                  </div>
                  <span
                    style={{
                      ...monoXs,
                      color: theme.text,
                      marginTop: 12,
                      fontWeight: 700,
                    }}
                  >
                    {DURATION_BY_ID.hd.label} — {halfDay}€
                  </span>
                  <span style={{ ...monoXs, color: subtle, marginTop: 6 }}>
                    + IVA
                  </span>
                </div>

                {/* Right: bullets + CTA */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    minWidth: isMobile ? 0 : 250,
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
                    {t.includes.map((b) => (
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
                  {/*
                    Base Hire only. The photographs ARE the Base Hire kit, and
                    the Full Day ticket reads "Everything in Base Hire" plus
                    more — showing this tour there would be half the answer
                    dressed as the whole one.
                  */}
                  {t.id === "base" && (
                    <button
                      type="button"
                      onClick={() => setTourOpen(true)}
                      style={{
                        ...monoXs,
                        alignSelf: "flex-start",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "11px 16px",
                        cursor: "pointer",
                        background: "transparent",
                        color: theme.text,
                        border: `1px solid ${theme.text}`,
                        letterSpacing: "0.18em",
                      }}
                    >
                      SEE THE EQUIPMENT
                      <span style={{ opacity: 0.5 }}>
                        {BASE_HIRE_PHOTO_COUNT} PHOTOS
                      </span>
                      <ScribbleArrowIcon
                        variant="right"
                        width={26}
                        height={12}
                        color={theme.text}
                      />
                    </button>
                  )}
                  {/*
                    The Adobe gallery, for the tickets that have no tour of
                    their own. Base Hire dropped it when SEE THE EQUIPMENT
                    started showing the same kit without leaving the site;
                    Full Day still links out, because its extra gear is not
                    photographed here yet.
                  */}
                  {t.id !== "base" && (
                    <a
                      href={t.equipmentListUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...monoXs,
                        color: theme.text,
                        textDecoration: "underline",
                        textUnderlineOffset: 4,
                        alignSelf: "flex-start",
                      }}
                    >
                      SEE EQUIPMENT LIST →
                    </a>
                  )}
                  <a
                    href="/booking"
                    style={{
                      marginTop: 4,
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
              </div>
            </div>
          );
        })}
      </section>

      {/* SECTION 2b — TIME RULES & SURCHARGES
          These are billed AFTER the shoot, so they cannot be options in the
          booking flow. Stating them here is the only honest place for them:
          a client who finds out about 55€/h at invoice time was misled. */}
      <section style={{ background: "#111111", padding: isMobile ? "48px 0" : "72px 0" }}>
        <div className="kiddo-container">
          <span style={{ ...monoXs, color: "rgba(255,255,255,0.4)" }}>
            // STUDIO TIME RULES
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem,4.5vw,3.5rem)",
              lineHeight: 0.95,
              textTransform: "uppercase",
              color: "#fff",
              margin: "12px 0 8px",
            }}
          >
            THE SMALL PRINT,
            <br />
            <HandwrittenWord
              text="out loud."
              color={kiddoColors.lime}
              fontSize="inherit"
              rotation={-2}
            />
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: isMobile ? 20 : 32,
              marginTop: 36,
              borderTop: "1px solid rgba(255,255,255,0.12)",
              paddingTop: 28,
            }}
          >
            {[
              {
                k: `${OVERTIME.standard}€/H`,
                t: "OVERTIME",
                d: "Billed automatically for any time running past the agreed wrap.",
              },
              {
                k: `${OVERTIME.offHours}€/H`,
                t: "OFF HOURS",
                d: `Before ${STUDIO_DAY.open} or after ${STUDIO_DAY.close}, whatever the day.`,
              },
              {
                k: WEEKEND_BADGE.replace(" APPLIED", ""),
                t: "WEEKEND & HOLIDAYS",
                d: "Saturdays, Sundays and public holidays, on studio time.",
              },
            ].map((r) => (
              <div key={r.t} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2.2rem,4vw,3.2rem)",
                    lineHeight: 1,
                    color: kiddoColors.lime,
                  }}
                >
                  {r.k}
                </span>
                <span style={{ ...monoXs, color: "#fff" }}>{r.t}</span>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  {r.d}
                </span>
              </div>
            ))}
          </div>

          <p
            style={{
              ...monoXs,
              color: "rgba(255,255,255,0.4)",
              marginTop: 28,
              letterSpacing: "0.15em",
              lineHeight: 1.8,
            }}
          >
            ALL STUDIO RATES EXCLUDE IVA.
          </p>
        </div>
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
                PLUS IVA · INVOICED AFTER
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

      {/*
        Mounted once, at the end of the page rather than inside the ticket.
        <Modal> portals to document.body and renders nothing while closed, so
        where it sits in this tree costs nothing — but keeping it out of the
        ticket keeps the ticket's own markup readable.
      */}
      <BaseHireTourModal open={tourOpen} onClose={() => setTourOpen(false)} />
    </>
  );
}
