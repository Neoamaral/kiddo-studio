"use client";
import { useState } from "react";
import {
  HandwrittenWord,
  SmallTextArrowLink,
  ScribbleArrowIcon,
} from "@/components/kiddo-assets";

type ProjectSize = "sm" | "md" | "lg" | "xl";

interface Project {
  id: string;
  title: string;
  client: string;
  cat: string;
  year: string;
  thumb: string;
  featured?: boolean;
  kind: string;
  size: ProjectSize;
}

const PROJECTS_DATA: Project[] = [
  { id: "neon-ice", title: "NEON ICE", client: "Neon Ice", cat: "FASHION", year: "2025", thumb: "/images/neon-ice/ni-05-black-hoodie-front.jpg", featured: true, kind: "UV Campaign · Catalogue + Video", size: "xl" },
  { id: "p2", title: "DESERT BLOOM", client: "Florea Cosmetics", cat: "BEAUTY", year: "2025", thumb: "/images/project-01.jpg", kind: "Commercial · Product", size: "md" },
  { id: "p3", title: "ECLIPSE", client: "Independent", cat: "MUSIC VIDEO", year: "2025", thumb: "/images/project-02.jpg", kind: "Music video · Narrative", size: "lg" },
  { id: "p4", title: "CHROME DRIVE", client: "Volta Motors", cat: "AUTOMOTIVE", year: "2024", thumb: "/images/project-03.jpg", kind: "Studio shoot · Product launch", size: "md" },
  { id: "p5", title: "GHOST SHEETS", client: "Independent", cat: "ART", year: "2024", thumb: "/images/project-04.jpg", kind: "Conceptual · Editorial", size: "sm" },
  { id: "p6", title: "RED HOUR", client: "—", cat: "PORTRAIT", year: "2024", thumb: "/images/project-05.jpg", kind: "Portrait · Mood", size: "lg" },
  { id: "p7", title: "FACE/OFF", client: "Studio editorial", cat: "FASHION", year: "2024", thumb: "/images/project-06.jpg", kind: "Editorial · Studio", size: "md" },
];

const CATS = ["ALL", "FASHION", "MUSIC VIDEO", "COMMERCIAL", "BEAUTY", "AUTOMOTIVE", "ART", "PORTRAIT"];

const TIMELINE = [
  { y: "2023", count: 38, h: ["A photo series. A few weddings. Saying yes to everything."] },
  { y: "2024", count: 47, h: ["First big campaigns.", "Built the prop room.", "Hired Mar."] },
  { y: "2025", count: 35, h: ["Black Box opens.", "Neon Ice campaign.", "Hit 120 projects."] },
];

const CLIENTS_ROWS = [
  ["NEON ICE", "FLOREA", "VOLTA", "RED LAB", "STUDIO 7", "MUTE"],
  ["AURA", "PALMA", "ECHO", "BLANK", "CHORUS", "OFF SEASON"],
];

const SIZE_MAP: Record<ProjectSize, { gridColumn: string; aspectRatio: string }> = {
  sm: { gridColumn: "span 3", aspectRatio: "3/4" },
  md: { gridColumn: "span 4", aspectRatio: "4/5" },
  lg: { gridColumn: "span 5", aspectRatio: "4/3" },
  xl: { gridColumn: "span 6", aspectRatio: "16/9" },
};

export default function ProjectsPageClient() {
  const [filter, setFilter] = useState("ALL");

  const shown = filter === "ALL" ? PROJECTS_DATA : PROJECTS_DATA.filter((p) => p.cat === filter);
  const feature = shown.find((p) => p.featured) || shown[0];
  const rest = shown.filter((p) => p.id !== feature?.id);

  return (
    <>
      {/* COVER */}
      <section style={{ background: "#111111", position: "relative", overflow: "hidden", minHeight: 760 }}>
        <img
          src={feature?.thumb}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.9) 100%)" }} />

        {/* Top corner marks */}
        <div style={{ position: "absolute", top: 36, left: 64, right: 64, display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.8)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase" }}>KIDDO · ISSUE 04 · PROJECTS 2023—2025</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase" }}>{PROJECTS_DATA.length} STORIES INSIDE</span>
        </div>

        {/* Main title */}
        <div className="kiddo-container" style={{ padding: "100px 0 0", position: "relative" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>WORK · WHAT WE&apos;VE BEEN UP TO</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(5rem,14vw,13.75rem)", lineHeight: 0.82, letterSpacing: "-0.03em", color: "#fff" }}>
            STUFF<br />
            WE&apos;VE <HandwrittenWord text="made" color={"#C8E820"} fontSize="inherit" rotation={-3} />.
          </h1>
        </div>

        {/* Bottom featured stripe */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "20px 64px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 24, alignItems: "center", borderTop: "1px solid #C8E820", background: "rgba(17,17,17,0.7)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", background: "#C8E820", color: "#1A1A1A", padding: "4px 8px" }}>★ FEATURE</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>{feature?.cat} · {feature?.year}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1, color: "#fff" }}>{feature?.title}</h3>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>— {feature?.kind}</span>
          </div>
          <SmallTextArrowLink label="VIEW PROJECT" href="#neon-ice" color="#fff" underlineColor={"#C8E820"} />
        </div>
      </section>

      {/* TOOLBAR */}
      <div style={{ background: "#F2EFE6", borderBottom: "1px solid rgba(0,0,0,0.1)", position: "sticky", top: 0, zIndex: 5 }}>
        <div className="kiddo-container" style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,0,0,0.5)", flexShrink: 0, marginRight: 8 }}>INDEX:</span>
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding: "8px 12px",
                background: filter === c ? "#1A1A1A" : "transparent",
                color: filter === c ? "#C8E820" : "#1A1A1A",
                border: `1px solid ${filter === c ? "#1A1A1A" : "rgba(0,0,0,0.15)"}`,
                whiteSpace: "nowrap",
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              {c}
            </button>
          ))}
          <span style={{ marginLeft: "auto", flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase" }}>{shown.length}/{PROJECTS_DATA.length} SHOWING</span>
        </div>
      </div>

      {/* TIMELINE */}
      <section style={{ background: "#F2EFE6", padding: "56px 0 40px" }}>
        <div className="kiddo-container" style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,0,0,0.45)", marginBottom: 6 }}>BY YEAR · A QUICK SCAN</p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 60, lineHeight: 1 }}>
            THREE YEARS, <HandwrittenWord text="messy." color={"#C8E820"} fontSize={52} rotation={-3} />
          </h2>
        </div>
        <div className="kiddo-container" style={{ display: "flex", gap: 24, overflowX: "auto" }}>
          {TIMELINE.map((y, i) => (
            <div
              key={y.y}
              style={{
                minWidth: 320,
                flex: "0 0 auto",
                background: i === 2 ? "#C8E820" : "#fff",
                padding: 20,
                border: i === 2 ? "none" : "1px solid #1A1A1A",
                transform: `rotate(${i % 2 ? 1 : -1}deg)`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1 }}>{y.y}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,0,0,0.55)" }}>{y.count} PROJ</span>
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6, padding: 0, margin: 0 }}>
                {y.h.map((h) => (
                  <li key={h} style={{ fontFamily: "var(--font-hand)", fontSize: 16, color: "rgba(0,0,0,0.75)" }}>· {h}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* NEON ICE FEATURE */}
      <section id="neon-ice" style={{ background: "#F2EFE6", padding: "32px 0 56px" }}>
        <div className="kiddo-container" style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,0,0,0.45)" }}>ALL PROJECTS · NEON ICE · FEATURED</p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem,8vw,8rem)", lineHeight: 0.85, letterSpacing: "-0.02em" }}>NEON ICE × KIDDO.</h2>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", marginTop: 6 }}>UV PHOTOGRAPHY — FASHION — 2025</p>
        </div>

        {/* Image grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, padding: "0 8px 8px" }}>
          <img src="/images/neon-ice/ni-01-uv-white-front.jpg" alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", gridRow: "span 2" }} />
          <img src="/images/neon-ice/ni-02-uv-white-back.jpg" alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
          <img src="/images/neon-ice/ni-03-uv-black-hoodie.jpg" alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
          <img src="/images/neon-ice/ni-04-uv-black-moody.jpg" alt="" style={{ width: "100%", aspectRatio: "2/1", objectFit: "cover", gridColumn: "span 2" }} />
        </div>

        {/* Video strip */}
        <div style={{ display: "flex", gap: 8, padding: "8px 8px 0" }}>
          <video src="/videos/neon-ice/hoodie-negro.mov" muted autoPlay loop playsInline style={{ flex: 1, aspectRatio: "9/16", objectFit: "cover", maxWidth: 300 }} />
          <video src="/videos/neon-ice/hoodie-azul.mov" muted autoPlay loop playsInline style={{ flex: 1, aspectRatio: "9/16", objectFit: "cover", maxWidth: 300 }} />
          <div style={{ flex: 2, background: "#1A1A1A", padding: 24, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "#fff", lineHeight: 1, marginBottom: 12 }}>NEON ICE</p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>UV-lit studio session for the loud catalogue cover, and a moody black box session for the editorial spread. 3 days · 8 humans · UV lights.</p>
          </div>
        </div>

        {/* Act II photos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "8px 8px 0" }}>
          <img src="/images/neon-ice/ni-06-black-hoodie-hood.jpg" alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
          <img src="/images/neon-ice/ni-07-blue-hoodie.jpg" alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
          <img src="/images/neon-ice/ni-08-white-hoodie.jpg" alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
        </div>
      </section>

      {/* GRID */}
      <section style={{ background: "#F2EFE6", padding: "0 0 80px" }}>
        <div className="kiddo-container" style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,0,0,0.45)" }}>ALL PROJECTS · IN NO PARTICULAR ORDER</p>
        </div>
        <div className="kiddo-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16, gridAutoFlow: "dense" }}>
            {rest.map((p, i) => {
              const s = SIZE_MAP[p.size] || SIZE_MAP.md;
              return (
                <div key={p.id} style={{ gridColumn: s.gridColumn, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ position: "relative", aspectRatio: s.aspectRatio, overflow: "hidden", background: "#1A1A1A" }}>
                    <img src={p.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", top: 10, left: 10 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", background: "rgba(255,255,255,0.9)", color: "#1A1A1A", padding: "3px 6px" }}>{String(i + 2).padStart(2, "0")}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1 }}>{p.title}</h3>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,0,0,0.45)", marginTop: 4 }}>{p.cat} · {p.year}</p>
                    </div>
                    <ScribbleArrowIcon variant="diagonal" width={20} height={20} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CLIENTS MARQUEE */}
      <section style={{ background: "#C8E820", padding: "60px 0", borderTop: "1px solid #1A1A1A", borderBottom: "1px solid #1A1A1A", position: "relative", overflow: "hidden" }}>
        <div className="kiddo-container" style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,0,0,0.55)" }}>SOME PEOPLE WE&apos;VE PLAYED WITH · 2021–2025</p>
        </div>
        {CLIENTS_ROWS.map((row, rowI) => (
          <div
            key={rowI}
            style={{
              display: "flex",
              gap: 32,
              overflowX: "auto",
              padding: rowI > 0 ? "12px 64px 0" : "0 64px 12px",
              borderTop: rowI > 0 ? "1px solid rgba(0,0,0,0.15)" : undefined,
            }}
          >
            {row.map((c) => (
              <span key={c} style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "#1A1A1A", lineHeight: 1, whiteSpace: "nowrap", letterSpacing: "-0.01em", flexShrink: 0 }}>{c}</span>
            ))}
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ background: "#111111", padding: "100px 0", color: "#fff", position: "relative" }}>
        <div className="kiddo-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 28 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem,7vw,6.875rem)", lineHeight: 0.9 }}>
            GOT A PROJECT?<br />
            <HandwrittenWord text="let's chat." color={"#C8E820"} fontSize="inherit" rotation={-3} />
          </h2>
          <a
            href="/contact"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", background: "#C8E820", color: "#1A1A1A", border: "1px solid #C8E820", padding: "12px 22px", display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}
          >
            GET IN TOUCH <ScribbleArrowIcon variant="right" width={20} height={10} color={"#1A1A1A"} />
          </a>
        </div>
      </section>
    </>
  );
}
