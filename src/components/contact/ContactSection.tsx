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
  SmallTextArrowLink,
  StudioMap,
  STUDIO_MAP_POINTS,
  kiddoColors,
} from "@/components/kiddo-assets";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function ContactSection() {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({ name: "", email: "", message: "", type: "STUDIO" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, subject: form.type }),
      });
      setSent(true);
    } catch {
      setSent(true); // still show success
    }
    setLoading(false);
  };

  return (
    <>
      {/* ── Part 1: Hero ── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: isMobile ? 480 : 640,
          display: "flex",
        }}
      >
        {/* Background photo — full bleed */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/studio-interior.jpg"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            filter: "grayscale(30%) brightness(0.45)",
          }}
        />
        {/* Subtle cream tint overlay on the left so text stays legible */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: isMobile
              ? "rgba(18,18,18,0.45)"
              : "linear-gradient(to right, rgba(18,18,18,0.7) 50%, rgba(18,18,18,0.25) 100%)",
          }}
        />

        {/* Decorations — only on desktop, inside photo area */}
        {!isMobile && (
          <div style={{ position: "absolute", top: 40, right: 100 }}>
            <HandDrawnStarIcon width={44} color={"#C8E820"} />
          </div>
        )}
        {!isMobile && (
          <div style={{ position: "absolute", bottom: 48, right: 80 }}>
            <CircularBadgeSeal size={88} color={"#C8E820"} bgColor={"transparent"} spinning />
          </div>
        )}

        {/* Content */}
        <div
          className="kiddo-container"
          style={{
            position: "relative",
            zIndex: 2,
            paddingTop: isMobile ? 48 : 72,
            paddingBottom: isMobile ? 48 : 80,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
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
            CONTACT · GET IN TOUCH
          </p>

          {/* THE MASSIVE "hi." */}
          <div
            style={{
              position: "relative",
              display: "inline-block",
              marginBottom: 0,
            }}
          >
            <h1>
              <HandwrittenWord text="hi." color={"#C8E820"} fontSize={"clamp(72px, 22vw, 380px)"} rotation={-3} />
            </h1>
            <div
              style={{
                position: "absolute",
                left: 30,
                bottom: -20,
                transform: "rotate(-2deg)",
              }}
            >
              <BrushUnderline variant="long" color={"rgba(255,255,255,0.6)"} width={isMobile ? 200 : 340} />
            </div>
          </div>

          <p
            style={{
              fontSize: isMobile ? 18 : 22,
              color: "rgba(255,255,255,0.75)",
              maxWidth: 420,
              marginTop: 48,
              fontFamily: "var(--font-hand)",
              lineHeight: 1.5,
            }}
          >
            We answer messages. Promise.
          </p>
        </div>
      </section>

      {/* ── Part 2: Body (channels + form) ── */}
      <section
        style={{
          background: "#F2EFE6",
          padding: "60px 0 100px",
          position: "relative",
        }}
      >
        <div
          className="kiddo-container"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr",
            gap: isMobile ? 40 : 80,
          }}
        >
          {/* Left: big channel info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            {[
              {
                label: "EMAIL",
                value: "play@kiddostudio.pt",
                note: "Replies within 24h — usually faster",
              },
              {
                label: "PHONE",
                value: "+351 21 000 0000",
                note: "Mon–Fri, 9h–19h, Lisbon time",
              },
              {
                label: "STUDIO",
                value: "Rua Saudade 14, Lisboa",
                note: "38.7223° N · 9.1393° W · Free parking",
              },
              {
                label: "WHATSAPP",
                value: "@kiddostudio",
                note: "For quick chats and out-of-hours",
              },
            ].map((ch) => (
              <div
                key={ch.label}
                style={{ borderTop: "1px solid rgba(0,0,0,0.1)", paddingTop: 16 }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "rgba(0,0,0,0.45)",
                    marginBottom: 8,
                  }}
                >
                  {ch.label}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2rem,4vw,3.4rem)",
                    lineHeight: 1,
                    marginBottom: 8,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {ch.value}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(0,0,0,0.5)",
                    fontFamily: "var(--font-hand)",
                  }}
                >
                  {ch.note}
                </p>
              </div>
            ))}

            {/* Social links */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                paddingTop: 20,
                borderTop: "1px solid rgba(0,0,0,0.1)",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "rgba(0,0,0,0.4)",
                }}
              >
                FOLLOW ALONG:
              </span>
              {[
                { l: "INSTAGRAM", h: "@kiddo.studio" },
                { l: "BEHANCE", h: "kiddostudio" },
                { l: "LINKEDIN", h: "kiddo-studio" },
              ].map((s) => (
                <a
                  key={s.l}
                  href="#"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {s.l}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>{s.h}</span>
                  <ScribbleArrowIcon variant="diagonal" width={14} height={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Right: form card */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: -14, right: 20, zIndex: 5 }}>
              <TapeStrip variant="yellow" width={120} rotation={6} />
            </div>
            <div
              style={{
                background: "#fff",
                border: `1px solid #1A1A1A`,
                padding: 28,
                position: "relative",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "rgba(0,0,0,0.45)",
                  marginBottom: 8,
                }}
              >
                OR USE THIS FORM
              </p>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 30,
                  lineHeight: 1,
                  marginBottom: 20,
                }}
              >
                QUICK NOTE.
              </h3>

              {sent ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    alignItems: "flex-start",
                    padding: "20px 0",
                  }}
                >
                  <SmileyFaceIcon variant="drip" width={84} fill={"#C8E820"} />
                  <h4
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 36,
                      lineHeight: 1,
                    }}
                  >
                    SENT!
                  </h4>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(0,0,0,0.6)",
                      lineHeight: 1.6,
                    }}
                  >
                    Check your inbox in the next 24h.
                  </p>
                  <SmallTextArrowLink label="SEND ANOTHER" href="/contact" color={"#1A1A1A"} />
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  {/* Topic selector */}
                  <div>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "rgba(0,0,0,0.5)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      I&apos;M HERE FOR…
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {(["STUDIO", "PRODUCTION", "GEAR", "JUST SAYING HI"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm({ ...form, type: t })}
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            padding: "6px 10px",
                            background: form.type === t ? "#1A1A1A" : "transparent",
                            color: form.type === t ? "#C8E820" : "#1A1A1A",
                            border: `1px solid ${form.type === t ? "#1A1A1A" : "rgba(0,0,0,0.2)"}`,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "rgba(0,0,0,0.5)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      YOUR NAME
                    </label>
                    <input
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "14px 0",
                        fontFamily: "var(--font-body)",
                        fontSize: 14,
                        color: "#1A1A1A",
                        background: "transparent",
                        border: 0,
                        borderBottom: "1px solid rgba(0,0,0,0.25)",
                        outline: "none",
                      }}
                      placeholder="Who's writing?"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "rgba(0,0,0,0.5)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      EMAIL
                    </label>
                    <input
                      type="email"
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "14px 0",
                        fontFamily: "var(--font-body)",
                        fontSize: 14,
                        color: "#1A1A1A",
                        background: "transparent",
                        border: 0,
                        borderBottom: "1px solid rgba(0,0,0,0.25)",
                        outline: "none",
                      }}
                      placeholder="you@somewhere.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "rgba(0,0,0,0.5)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      A FEW WORDS
                    </label>
                    <textarea
                      rows={3}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "14px 0",
                        fontFamily: "var(--font-body)",
                        fontSize: 14,
                        color: "#1A1A1A",
                        background: "transparent",
                        border: 0,
                        borderBottom: "1px solid rgba(0,0,0,0.25)",
                        outline: "none",
                        resize: "vertical",
                        minHeight: 60,
                      }}
                      placeholder="What are you up to?"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!form.name || !form.email || loading}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      background: "#C8E820",
                      color: "#1A1A1A",
                      border: "1px solid #1A1A1A",
                      padding: "12px 22px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      width: "100%",
                      opacity: !form.name || !form.email ? 0.5 : 1,
                    }}
                  >
                    <span>{loading ? "SENDING..." : "SEND IT"}</span>
                    <ScribbleArrowIcon variant="right" width={20} height={10} color={"#1A1A1A"} />
                  </button>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.25em",
                      textTransform: "uppercase",
                      color: "rgba(0,0,0,0.4)",
                      textAlign: "center",
                    }}
                  >
                    NO BOTS · NO SPAM · NO BS
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Part 3: Map section ── */}
      <section style={{ background: "#111111", position: "relative", overflow: "hidden" }}>
        <div style={{ padding: isMobile ? "40px 20px 0" : "56px 64px 0" }}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 8,
            }}
          >
            // THE STUDIO · GOOGLE-PIN
          </p>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 80,
              color: "#fff",
              lineHeight: 1,
            }}
          >
            FIND US.
          </h2>
        </div>
        <div style={{ position: "relative", aspectRatio: "16/9", marginTop: 24 }}>
          <StudioMap />
          {/* Floating address card */}
          <div
            style={{
              position: "absolute",
              bottom: 30,
              left: isMobile ? 12 : 64,
              background: "#fff",
              padding: 16,
              maxWidth: 260,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "rgba(0,0,0,0.5)",
                marginBottom: 4,
              }}
            >
              // 24/7 ACCESS POSSIBLE
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              RUA SAUDADE 14
            </p>
            <p style={{ fontSize: 12, color: "rgba(0,0,0,0.6)" }}>1100-321 Lisboa, Portugal</p>
            <a
              href="https://maps.google.com/?q=Rua+Saudade+14+Lisboa"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 10,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700 }}>
                OPEN IN MAPS
              </span>
              <ScribbleArrowIcon variant="diagonal" width={14} height={14} />
            </a>
          </div>
        </div>

        {/* The same four landmarks as text. On a phone the labels inside the
            map are far too small to read, and this is also what a screen
            reader gets instead of one long alt string. */}
        <div
          style={{
            padding: isMobile ? "28px 20px 48px" : "36px 64px 64px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: isMobile ? 18 : 28,
          }}
        >
          {STUDIO_MAP_POINTS.map((point) => (
            <div key={point.n} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: kiddoColors.lime,
                  color: kiddoColors.black,
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {point.n}
              </span>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 17,
                  letterSpacing: "0.01em",
                  color: "#fff",
                  lineHeight: 1.1,
                  paddingTop: 3,
                }}
              >
                {point.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
