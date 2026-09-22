"use client";
import Link from "next/link";
import {
  HandwrittenWord,
  BrushUnderline,
  ScribbleArrowIcon,
  ScribbleCircle,
  TapeStrip,
  GridPaperPatch,
  CollagePhotoFrame,
  SmileyFaceIcon,
  SmallTextArrowLink,
  kiddoColors,
} from "@/components/kiddo-assets";
import { BOOKING_HREF, STUDIO_COORDINATES } from "@/lib/site";

export default function HeroSection() {
  return (
    <section className="section-cream min-h-[90vh] overflow-hidden">
      <div className="kiddo-container grid grid-cols-1 lg:grid-cols-[55%_45%] gap-0 min-h-[90vh]">
        {/* Left column */}
        <div className="relative flex flex-col justify-center py-16 lg:py-24 pr-0 lg:pr-12">
          {/* Decorative scribble circle */}
          <div className="absolute top-8 left-8 opacity-40">
            <ScribbleCircle width={48} />
          </div>

          {/* Label */}
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-black/40 mb-6 pl-8 lg:pl-0">
            CREATIVE PLAYGROUND
          </p>

          {/* Headline */}
          <div className="pl-8 lg:pl-0">
            <h1
              className="font-display leading-none text-kiddo-black"
              style={{ fontSize: "clamp(4rem,9vw,9rem)" }}
            >
              <span className="block">WE DON&apos;T</span>
              <span className="block">WORK.</span>
              <span className="block">
                WE{" "}
                <HandwrittenWord
                  text="PLAY."
                  color={kiddoColors.lime}
                  fontSize="inherit"
                />
              </span>
            </h1>

            {/* Brush underline */}
            <div className="mt-2 mb-6">
              <BrushUnderline variant="long" width={340} color={kiddoColors.lime} />
            </div>

            {/* Tagline. mb-3 so it groups with the location line below it
                rather than reading as two unrelated paragraphs. */}
            <p className="font-body text-sm text-black/50 max-w-sm mb-3 leading-relaxed">
              A space for filmmakers, photographers and dreamers.
            </p>

            {/* Location. Sits immediately above the CTA on purpose: it answers
                "can I get there?" right before "shall I?". */}
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-black/40 mb-6">
              20 MIN FROM LISBON
            </p>

            {/* Arrow + link */}
            <div className="flex flex-col gap-4">
              <ScribbleArrowIcon variant="down" width={28} height={28} />
              <SmallTextArrowLink label="BOOK THE STUDIO" href={BOOKING_HREF} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="relative flex items-center justify-center py-16 lg:py-12 overflow-visible">
          {/* Grid paper behind photo */}
          <div className="absolute bottom-24 left-0 z-0 hidden lg:block">
            <GridPaperPatch width={180} height={160} rotation={4} />
          </div>

          {/* Yellow tape above photo */}
          <div className="absolute top-16 left-8 z-10">
            <TapeStrip variant="yellow" width={200} rotation={-8} />
          </div>

          {/* Main photo */}
          <div className="relative z-10">
            <CollagePhotoFrame
              src="/images/hero-camera.jpg"
              alt="Filmmaker at Kiddo Studio"
              blackAndWhite
              rotation={-4}
              width={300}
              height={380}
            />
          </div>

          {/* Black tape crossing bottom */}
          <div className="absolute bottom-28 right-4 z-20">
            <TapeStrip variant="black" width={160} rotation={6} />
          </div>

          {/* Smiley face right of photo.
              The float goes on the ICON, not on this wrapper: the wrapper's
              centring IS a transform, and a keyframe overwrites the whole
              transform property — animating it here would drop the smiley
              87px on the first frame. */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden lg:block">
            <SmileyFaceIcon
              variant="drip"
              width={130}
              height={175}
              fill={kiddoColors.lime}
              className="animate-float-slow"
            />
          </div>

          {/* "Make something weird" — the right column's route to booking.
              Was a span with a decorative arrow pointing nowhere. */}
          <Link
            href={BOOKING_HREF}
            className="group absolute bottom-16 left-0 flex items-center gap-1 z-20"
          >
            <span
              className="relative font-display text-[11px] tracking-widest uppercase"
              style={{ color: kiddoColors.black }}
            >
              MAKE SOMETHING WEIRD.
              {/* Same lime hover bar SmallTextArrowLink uses, so the hover
                  affordance speaks the site's existing language. */}
              <span
                className="absolute left-0 -bottom-[3px] w-full h-[2px] opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: kiddoColors.lime }}
              />
            </span>
            <ScribbleArrowIcon variant="right" width={24} height={16} />
          </Link>

          {/* Coordinates */}
          <p
            className="absolute bottom-8 left-0 font-mono text-[9px] text-black/40 z-20"
          >
            {STUDIO_COORDINATES}
          </p>

          {/* Vertical "KIDDO STUDIO" right edge */}
          <span
            className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 font-display text-[11px] tracking-[0.3em] text-black/20 z-10"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg) translateY(50%)" }}
          >
            KIDDO STUDIO
          </span>
        </div>
      </div>
    </section>
  );
}
