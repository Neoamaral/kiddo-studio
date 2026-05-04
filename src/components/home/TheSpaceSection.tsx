"use client";
import {
  BrushUnderline,
  CircleArrowButton,
  SmallTextArrowLink,
  kiddoColors,
} from "@/components/kiddo-assets";
import { SPACE_ROOMS } from "@/lib/site";

export default function TheSpaceSection() {
  return (
    <section className="section-dark overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[28%_72%]">
        {/* Left block */}
        <div className="flex flex-col justify-center gap-5 px-8 md:px-12 lg:px-16 py-20 lg:py-24">
          <h2
            className="font-display text-white"
            style={{ fontSize: "clamp(3rem,5vw,5.5rem)", lineHeight: 1 }}
          >
            THE SPACE
          </h2>

          <BrushUnderline variant="short" color={kiddoColors.lime} width={160} />

          <p className="font-body text-white/60 text-[14px] leading-relaxed max-w-[220px]">
            Different corners. Endless possibilities.
          </p>

          <SmallTextArrowLink
            label="EXPLORE ALL"
            href="/studio"
            color={kiddoColors.lime}
            underlineColor={kiddoColors.lime}
          />
        </div>

        {/* Right image strip */}
        <div className="relative flex overflow-x-auto lg:overflow-hidden">
          {SPACE_ROOMS.map((room) => (
            <div
              key={room.label}
              className="relative flex-1 min-w-[160px]"
              style={{ aspectRatio: "3/4", minHeight: 320 }}
            >
              <img
                src={room.src}
                alt={room.label}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)" }}
              />
              {/* Label */}
              <span className="absolute bottom-4 left-4 font-mono text-[10px] text-white tracking-widest uppercase z-10">
                {room.label}
              </span>
            </div>
          ))}

          {/* Arrow button */}
          <a
            href="/studio"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20"
          >
            <CircleArrowButton variant="filled" size={52} />
          </a>
        </div>
      </div>
    </section>
  );
}
