"use client";
import {
  SectionLabelNumber,
  NeonHighlightStroke,
  CameraSketchIcon,
  SmileyFaceIcon,
  HandDrawnStarIcon,
  BrushUnderline,
  kiddoColors,
} from "@/components/kiddo-assets";

const values = [
  {
    num: 1,
    title: "PLAY FIRST",
    body: "Ideas need room to breathe — and sometimes to get a little weird. We built this space for that first messy, exciting phase.",
    icon: <CameraSketchIcon width={90} height={76} showAccent={false} />,
  },
  {
    num: 2,
    title: "NO EGO",
    body: "Your project is the star. We're just here to make sure the light hits right and you have everything you need.",
    icon: <SmileyFaceIcon variant="drip" width={80} height={96} fill={kiddoColors.lime} />,
  },
  {
    num: 3,
    title: "MAKE IT REAL",
    body: "From a quick half-day shoot to a full production — we want to see you finish the thing. We'll help.",
    icon: <HandDrawnStarIcon width={80} height={80} color={kiddoColors.black} />,
  },
];

export default function AboutValuesSection() {
  return (
    <section className="section-cream">
      {/* Section header */}
      <div
        className="kiddo-container pt-16 lg:pt-20 pb-8"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
      >
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-black/40 mb-3">
          WHY KIDDO
        </p>
        <h2
          className="font-display text-kiddo-black leading-none mb-2"
          style={{ fontSize: "clamp(2rem,4vw,3.5rem)" }}
        >
          WHAT WE STAND FOR
        </h2>
        <BrushUnderline variant="long" color={kiddoColors.lime} width={240} />
      </div>

      {/* Cards */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
      >
        {values.map((v, i) => (
          <div
            key={v.title}
            className="p-8 lg:p-12 flex flex-col gap-5"
            style={{
              borderRight: i < values.length - 1 ? "1px solid rgba(0,0,0,0.08)" : undefined,
            }}
          >
            <SectionLabelNumber number={v.num} />

            {/* Icon with neon highlight */}
            <div className="relative flex items-end" style={{ minHeight: 110 }}>
              <div className="absolute inset-0 flex items-center justify-center opacity-70">
                <NeonHighlightStroke variant="square" width={100} opacity={0.8} />
              </div>
              <div className="relative z-10">{v.icon}</div>
            </div>

            <h3
              className="font-display text-kiddo-black"
              style={{ fontSize: "clamp(1.4rem,2.5vw,1.9rem)", lineHeight: 1 }}
            >
              {v.title}
            </h3>

            <p className="font-body text-[14px] text-black/55 leading-relaxed">
              {v.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
