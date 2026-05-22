"use client";
import {
  HandwrittenWord,
  BrushUnderline,
  ScribbleCircle,
  TapeStrip,
  GridPaperPatch,
  CollagePhotoFrame,
  SmallTextArrowLink,
  kiddoColors,
} from "@/components/kiddo-assets";
import { BOOKING_HREF } from "@/lib/site";

export default function AboutHeroSection() {
  return (
    <section className="section-cream overflow-hidden">
      <div className="kiddo-container grid grid-cols-1 lg:grid-cols-[55%_45%] min-h-[80vh]">

        {/* Left — copy */}
        <div className="relative flex flex-col justify-center py-20 lg:py-28 pr-0 lg:pr-12">
          {/* Decorative scribble */}
          <div className="absolute top-8 left-0 opacity-30">
            <ScribbleCircle width={44} />
          </div>

          {/* Label */}
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-black/40 mb-6">
            WHO WE ARE
          </p>

          {/* Headline */}
          <h1
            className="font-display text-kiddo-black leading-none mb-4"
            style={{ fontSize: "clamp(3.2rem,7vw,7rem)" }}
          >
            <span className="block">WE BUILT</span>
            <span className="block">THE SPACE</span>
            <span className="block">
              WE ALWAYS{" "}
              <HandwrittenWord
                text="WANTED."
                color={kiddoColors.lime}
                fontSize="inherit"
              />
            </span>
          </h1>

          <div className="mb-6">
            <BrushUnderline variant="long" color={kiddoColors.lime} width={320} />
          </div>

          <p className="font-body text-[15px] text-black/55 max-w-md leading-relaxed mb-8">
            Kiddo Studio was born out of frustration with boring, overpriced,
            uninspired spaces. We wanted somewhere that felt alive — where the
            walls have character, the light hits right, and the energy actually
            helps you create.
          </p>

          <SmallTextArrowLink label="BOOK THE STUDIO" href={BOOKING_HREF} />
        </div>

        {/* Right — collage photo */}
        <div className="relative flex items-center justify-center py-16 overflow-visible">
          {/* Grid paper behind photo */}
          <div className="absolute bottom-20 left-0 z-0 hidden lg:block">
            <GridPaperPatch width={160} height={140} rotation={-3} />
          </div>

          {/* Tape above photo */}
          <div className="absolute top-12 right-12 z-10">
            <TapeStrip variant="yellow" width={180} rotation={-6} />
          </div>

          {/* Photo */}
          <div className="relative z-10">
            <CollagePhotoFrame
              src="/images/studio-interior.jpg"
              alt="Kiddo Studio interior"
              rotation={3}
              tape="top"
              tapeColor="yellow"
              width={300}
              height={380}
            />
          </div>

          {/* Second tape crossing bottom */}
          <div className="absolute bottom-24 left-4 z-20">
            <TapeStrip variant="black" width={140} rotation={-5} />
          </div>
        </div>

      </div>
    </section>
  );
}
