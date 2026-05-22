"use client";
import {
  HandwrittenWord,
  ScribbleArrowIcon,
  CircularBadgeSeal,
  SmallTextArrowLink,
  kiddoColors,
} from "@/components/kiddo-assets";
import { BOOKING_HREF, STUDIO_COORDINATES } from "@/lib/site";

export default function AboutCtaSection() {
  return (
    <section style={{ background: kiddoColors.lime }} className="overflow-hidden">
      <div className="kiddo-container py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">

          {/* Left — copy + CTAs */}
          <div className="flex flex-col gap-6">
            <h2
              className="font-display text-kiddo-black leading-none"
              style={{ fontSize: "clamp(2.5rem,6vw,5.5rem)" }}
            >
              <span className="block">COME SEE IT FOR</span>
              <HandwrittenWord
                text="YOURSELF."
                color={kiddoColors.black}
                fontSize="inherit"
              />
            </h2>

            <p className="font-body text-[15px] text-black/60 max-w-md leading-relaxed">
              Book a studio tour or jump straight into a half-day session.
              The space is ready when you are.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2">
              {/* Primary CTA */}
              <a
                href={BOOKING_HREF}
                className="font-mono text-[11px] tracking-[0.15em] uppercase bg-kiddo-black text-kiddo-cream px-6 py-3 hover:bg-kiddo-dark transition-colors"
              >
                BOOK THE STUDIO →
              </a>
              {/* Secondary CTA */}
              <SmallTextArrowLink
                label="GET IN TOUCH"
                href="/contact"
                color={kiddoColors.black}
                underlineColor={kiddoColors.black}
              />
            </div>

            {/* Coordinates */}
            <p className="font-mono text-[9px] tracking-widest text-black/40 uppercase mt-2">
              {STUDIO_COORDINATES}
            </p>
          </div>

          {/* Right — badge + arrow decoration */}
          <div className="flex flex-col items-center gap-4 self-start lg:self-center">
            <CircularBadgeSeal
              size={120}
              spinning
              color={kiddoColors.black}
              bgColor={kiddoColors.lime}
            />
            <ScribbleArrowIcon
              variant="diagonal"
              color={kiddoColors.black}
              width={40}
              height={40}
            />
          </div>

        </div>
      </div>
    </section>
  );
}
