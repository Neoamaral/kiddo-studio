"use client";
import {
  BrushUnderline,
  HandwrittenWord,
  SmileyFaceIcon,
  ScribbleArrowIcon,
  kiddoColors,
} from "@/components/kiddo-assets";

const words = ["FILM", "PHOTO", "BRAND", "CAMPAIGN"];

export default function AboutStorySection() {
  return (
    <section className="section-dark overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[58%_42%]">

        {/* Left — story copy */}
        <div className="flex flex-col justify-center gap-6 px-8 md:px-12 lg:px-16 py-20 lg:py-28">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/30">
            OUR STORY
          </p>

          <h2
            className="font-display text-white leading-none"
            style={{ fontSize: "clamp(2.2rem,4vw,4rem)" }}
          >
            THIS ISN&apos;T{" "}
            <HandwrittenWord text="JUST" color={kiddoColors.lime} fontSize="inherit" />
            {" "}ANOTHER STUDIO.
          </h2>

          <BrushUnderline variant="short" color={kiddoColors.lime} width={200} />

          <div className="flex flex-col gap-4 max-w-lg">
            <p className="font-body text-[15px] text-white/60 leading-relaxed">
              We&apos;re a creative playground in the heart of Lisbon. Filmmakers,
              photographers, brands, and weirdos rent our space — and something
              interesting always comes out of it.
            </p>
            <p className="font-body text-[15px] text-white/60 leading-relaxed">
              The studio was designed to disappear into your project. Cyclorama,
              black box, prop room, creative area — each corner does something
              different.
            </p>
            <p className="font-body text-[15px] text-white/60 leading-relaxed">
              We handle the space so you can focus on the work.
            </p>
          </div>
        </div>

        {/* Right — vertical word stack */}
        <div className="relative flex items-center justify-center lg:justify-start px-8 lg:px-16 py-16 lg:py-28">
          <div className="flex flex-col items-start gap-0">
            {words.map((word, i) => (
              <div key={word} className="flex flex-col">
                {i !== 0 && (
                  <div
                    className="w-px h-10 ml-2"
                    style={{ background: "rgba(255,255,255,0.15)" }}
                  />
                )}
                <span
                  className="font-display text-white"
                  style={{ fontSize: "clamp(2.5rem,5vw,4.5rem)", lineHeight: 1 }}
                >
                  {word}
                </span>
              </div>
            ))}

            <div className="mt-8 flex flex-col items-start gap-3">
              <SmileyFaceIcon
                variant="clean"
                width={48}
                height={48}
                color={kiddoColors.cream}
                strokeWidth={1.5}
              />
              <ScribbleArrowIcon
                variant="right"
                width={36}
                height={16}
                color={kiddoColors.lime}
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
