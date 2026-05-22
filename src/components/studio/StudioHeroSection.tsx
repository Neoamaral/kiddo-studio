"use client";
import Link from "next/link";
import {
  HandwrittenWord,
  ScribbleArrowIcon,
  kiddoColors,
} from "@/components/kiddo-assets";

export default function StudioHeroSection() {
  return (
    <section
      className="section-dark overflow-hidden"
      style={{ minHeight: "85vh" }}
    >
      <div
        className="grid grid-cols-1 lg:grid-cols-[45%_55%]"
        style={{ minHeight: "85vh" }}
      >
        {/* Left column — text */}
        <div className="relative flex flex-col justify-center gap-6 px-8 md:px-12 lg:px-16 py-20 lg:py-24">
          {/* Label */}
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/30">
            THE SPACE
          </p>

          {/* Headline */}
          <h1
            className="font-display leading-none text-white"
            style={{ fontSize: "clamp(3rem,6vw,6rem)" }}
          >
            <span className="block">THIS IS WHERE</span>
            <span className="block">
              <HandwrittenWord
                text="IT HAPPENS."
                color={kiddoColors.lime}
                fontSize="inherit"
              />
            </span>
          </h1>

          {/* Body */}
          <p className="font-body text-[15px] leading-relaxed text-white/60 max-w-sm">
            Four distinct spaces. One address in Lisbon. Designed for the work.
          </p>

          {/* CTA */}
          <div className="flex flex-col gap-4">
            <Link
              href="/booking"
              className="inline-block self-start"
              style={{
                background: kiddoColors.black,
                color: kiddoColors.cream,
                padding: "14px 28px",
                border: `1.5px solid ${kiddoColors.cream}`,
              }}
            >
              <span className="font-mono text-[11px] tracking-widest uppercase">
                BOOK THE STUDIO →
              </span>
            </Link>
          </div>

          {/* Decorative arrow */}
          <div className="mt-2 opacity-50">
            <ScribbleArrowIcon
              variant="down"
              width={28}
              height={56}
              color={kiddoColors.lime}
            />
          </div>

          {/* Coordinates */}
          <p className="font-mono text-[9px] text-white/30 absolute bottom-8 left-8 md:left-12 lg:left-16">
            38.7223° N&nbsp;&nbsp;9.1393° W
          </p>
        </div>

        {/* Right column — image */}
        <div className="relative order-first lg:order-last">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/studio-interior.jpg"
            alt="Kiddo Studio interior"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              minHeight: "60vh",
              display: "block",
            }}
          />
          {/* Subtle dark overlay on left edge to blend with text column */}
          <div
            className="absolute inset-y-0 left-0 w-16 hidden lg:block"
            style={{
              background:
                "linear-gradient(to right, rgba(17,17,17,0.7), transparent)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
