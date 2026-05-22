"use client";
import Link from "next/link";
import {
  HandwrittenWord,
  CircularBadgeSeal,
  SmallTextArrowLink,
  kiddoColors,
} from "@/components/kiddo-assets";

export default function StudioCtaSection() {
  return (
    <section style={{ background: kiddoColors.lime }} className="overflow-hidden">
      <div className="kiddo-container py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">
          {/* Left — text + CTAs */}
          <div className="flex flex-col gap-6">
            {/* Headline */}
            <h2
              className="font-display leading-none"
              style={{
                fontSize: "clamp(2.5rem,5vw,5rem)",
                color: kiddoColors.black,
              }}
            >
              <span className="block">READY TO CREATE SOMETHING</span>
              <span className="block">
                <HandwrittenWord
                  text="GREAT?"
                  color={kiddoColors.black}
                  fontSize="inherit"
                />
              </span>
            </h2>

            {/* Body */}
            <p
              className="font-body text-[15px] leading-relaxed max-w-md"
              style={{ color: "rgba(26,26,26,0.65)" }}
            >
              Pick your space, pick your date. We&apos;ll handle the rest.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mt-2">
              <Link
                href="/booking"
                className="inline-block"
                style={{
                  background: kiddoColors.black,
                  color: kiddoColors.cream,
                  padding: "14px 32px",
                }}
              >
                <span className="font-mono text-[11px] tracking-widest uppercase">
                  BOOK THE STUDIO →
                </span>
              </Link>

              <SmallTextArrowLink
                label="TAKE A VIRTUAL TOUR"
                href="/projects"
                color={kiddoColors.black}
                underlineColor={kiddoColors.black}
              />
            </div>
          </div>

          {/* Right — badge */}
          <div className="flex items-center justify-center lg:justify-end">
            <CircularBadgeSeal
              size={110}
              spinning
              color={kiddoColors.black}
              bgColor={kiddoColors.lime}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
