"use client";
import {
  HandwrittenWord,
  BrushUnderline,
  TapeStrip,
  SmileyFaceIcon,
  ScribbleArrowIcon,
  SmallTextArrowLink,
  kiddoColors,
} from "@/components/kiddo-assets";

export default function StudioIntroSection() {
  return (
    <section className="section-dark overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[42%_58%]">
        {/* Left panel */}
        <div className="relative flex flex-col justify-center px-8 md:px-12 lg:px-16 py-20 lg:py-28 gap-6 z-10">
          {/* Filmstrip image with tape */}
          <div className="relative w-[160px] mb-2 self-start">
            <div
              className="overflow-hidden rounded-sm"
              style={{ transform: "rotate(-1deg)" }}
            >
              <img
                src="/images/studio-filmstrip.jpg"
                alt="Film strip"
                width={160}
                height={220}
                style={{
                  width: "160px",
                  height: "220px",
                  objectFit: "cover",
                  filter: "grayscale(80%) contrast(1.1)",
                  display: "block",
                }}
              />
            </div>
            <div className="absolute -top-2 left-4">
              <TapeStrip variant="yellow" width={120} rotation={-10} />
            </div>
          </div>

          {/* Headline */}
          <h2
            className="font-display text-white"
            style={{ fontSize: "clamp(2.5rem,4vw,4.5rem)", lineHeight: 1 }}
          >
            THIS IS NOT<br />JUST A STUDIO.
          </h2>

          {/* Brush underline */}
          <BrushUnderline variant="short" color={kiddoColors.lime} width={220} />

          {/* Body */}
          <p className="font-body text-white/60 text-[15px] leading-relaxed max-w-sm">
            It&apos;s a place where ideas get{" "}
            <HandwrittenWord
              text="weird,"
              color={kiddoColors.lime}
              fontSize="inherit"
            />{" "}
            and then real.
          </p>

          <SmallTextArrowLink
            label="ABOUT KIDDO"
            href="/about"
            color={kiddoColors.cream}
            underlineColor={kiddoColors.lime}
          />
        </div>

        {/* Right panel — full-bleed image */}
        <div className="relative h-[480px] lg:h-auto overflow-hidden">
          <img
            src="/images/studio-interior.jpg"
            alt="Kiddo Studio interior"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Dark overlay */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to right, rgba(17,17,17,0.4), transparent)" }}
          />

          {/* Right edge vertical list */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-10">
            {["PLAY", "CREATE", "SHOOT", "BUILD"].map((word, i) => (
              <div key={word} className="flex flex-col items-center gap-3">
                {i !== 0 && (
                  <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.3)" }} />
                )}
                <span
                  className="font-display text-white text-[11px] tracking-[0.2em]"
                >
                  {word}
                </span>
              </div>
            ))}
            {/* Smiley below list */}
            <div className="mt-4">
              <SmileyFaceIcon
                variant="clean"
                width={32}
                height={32}
                color={kiddoColors.cream}
                strokeWidth={1.5}
              />
            </div>
            <ScribbleArrowIcon variant="right" color={kiddoColors.cream} width={20} height={14} />
          </div>
        </div>
      </div>
    </section>
  );
}
