"use client";
import { useRef, useState } from "react";
import { BrushUnderline, SmallTextArrowLink, kiddoColors } from "@/components/kiddo-assets";
import { useIsMobile } from "@/hooks/useIsMobile";

const PHOTOS = [
  { src: "/images/neon-ice/ni-01-uv-white-front.jpg",  alt: "Neon ICE UV shoot — white set front" },
  { src: "/images/neon-ice/ni-03-uv-black-hoodie.jpg", alt: "Neon ICE UV shoot — Inner Monsters hoodie" },
  { src: "/images/neon-ice/ni-05-black-hoodie-front.jpg", alt: "Neon ICE — Neon Royalty black hoodie" },
  { src: "/images/neon-ice/ni-07-blue-hoodie.jpg",     alt: "Neon ICE — Blue Ice hoodie" },
  { src: "/images/neon-ice/ni-08-white-hoodie.jpg",    alt: "Neon ICE — Neon Royalty white hoodie" },
  { src: "/images/neon-ice/ni-02-uv-white-back.jpg",   alt: "Neon ICE UV shoot — white set back" },
  { src: "/images/neon-ice/ni-04-uv-black-moody.jpg",  alt: "Neon ICE UV shoot — black hoodie detail" },
  { src: "/images/neon-ice/ni-06-black-hoodie-hood.jpg", alt: "Neon ICE — black hoodie hood up" },
];

const VIDEOS = [
  { src: "/videos/neon-ice/hoodie-negro.mov", label: "NEON ROYALTY HOODIE BLACK" },
  { src: "/videos/neon-ice/hoodie-azul.mov",  label: "BLUE ICE HOODIE" },
];

function VideoThumb({ src, label, isMobile }: { src: string; label: string; isMobile: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  };

  return (
    <div
      className="relative shrink-0 overflow-hidden cursor-pointer group"
      style={{ width: isMobile ? 150 : 220, height: isMobile ? 220 : 300 }}
      onClick={toggle}
    >
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-between p-3 transition-opacity"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }}
      >
        {/* Play/pause badge */}
        <div className="self-end">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: playing ? "rgba(200,232,32,0.9)" : "rgba(255,255,255,0.85)" }}
          >
            {playing ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="2" y="1" width="3" height="10" fill="#1A1A1A" rx="1" />
                <rect x="7" y="1" width="3" height="10" fill="#1A1A1A" rx="1" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 1.5L10.5 6L3 10.5V1.5Z" fill="#1A1A1A" />
              </svg>
            )}
          </div>
        </div>
        {/* Label */}
        <span className="font-mono text-[9px] tracking-widest text-white uppercase">{label}</span>
      </div>
    </div>
  );
}

export default function RecentProjectsSection() {
  const isMobile = useIsMobile();
  return (
    <section className="section-cream py-16 lg:py-20 overflow-hidden">
      <div className="kiddo-container">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
          <div className="flex flex-col gap-2">
            {/* Client tag */}
            <div className="flex items-center gap-3">
              <span
                className="font-mono text-[9px] tracking-[0.3em] uppercase px-2 py-1"
                style={{ background: kiddoColors.lime, color: kiddoColors.black }}
              >
                FEATURED PROJECT
              </span>
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-black/40">
                2025 — FASHION CAMPAIGN
              </span>
            </div>
            <h2
              className="font-display text-kiddo-black"
              style={{ fontSize: "clamp(1.8rem,4vw,3rem)", lineHeight: 1 }}
            >
              NEON ICE × KIDDO STUDIO
            </h2>
            <BrushUnderline variant="long" color={kiddoColors.lime} width={300} />
            <p className="font-body text-sm text-black/50 max-w-md mt-1 leading-relaxed">
              Full campaign shoot — UV studio sessions, catalogue photography,
              and product unboxing videos. Studio rental + production.
            </p>
          </div>
          <SmallTextArrowLink label="VIEW ALL PROJECTS" href="/projects" />
        </div>

        {/* Scroll strip — photos + videos mixed */}
        <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
          {/* First 4 photos */}
          {PHOTOS.slice(0, 4).map((p) => (
            <div
              key={p.src}
              className="relative shrink-0 overflow-hidden group"
              style={{ width: isMobile ? 150 : 200, height: isMobile ? 220 : 300 }}
            >
              <img
                src={p.src}
                alt={p.alt}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.5s ease" }}
                className="group-hover:scale-105"
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(200,232,32,0.12)" }}
              />
            </div>
          ))}

          {/* Video 1 */}
          <VideoThumb {...VIDEOS[0]} isMobile={isMobile} />

          {/* Remaining 4 photos */}
          {PHOTOS.slice(4).map((p) => (
            <div
              key={p.src}
              className="relative shrink-0 overflow-hidden group"
              style={{ width: isMobile ? 150 : 200, height: isMobile ? 220 : 300 }}
            >
              <img
                src={p.src}
                alt={p.alt}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.5s ease" }}
                className="group-hover:scale-105"
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(200,232,32,0.12)" }}
              />
            </div>
          ))}

          {/* Video 2 */}
          <VideoThumb {...VIDEOS[1]} isMobile={isMobile} />
        </div>

        {/* Count tag */}
        <div className="mt-4 flex items-center gap-2">
          <span className="font-mono text-[9px] tracking-widest text-black/30 uppercase">
            {PHOTOS.length} PHOTOS · {VIDEOS.length} VIDEOS
          </span>
        </div>
      </div>
    </section>
  );
}
