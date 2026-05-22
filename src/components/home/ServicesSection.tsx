"use client";
import {
  SectionLabelNumber,
  NeonHighlightStroke,
  CameraSketchIcon,
  StoolSketchIcon,
  SmallTextArrowLink,
} from "@/components/kiddo-assets";

const cards = [
  {
    num: 1,
    title: "PRODUCTION",
    body: "Full production support — from concept to final delivery. Crew, direction, post.",
    link: "/projects",
    linkLabel: "VIEW WORK",
    icon: <CameraSketchIcon width={100} height={84} showAccent={false} />,
  },
  {
    num: 2,
    title: "STUDIO RENTAL",
    body: "Rent the space by the hour or full day. Need extra equipment? Just ask — we've got you covered.",
    link: "/studio",
    linkLabel: "BOOK NOW",
    icon: <StoolSketchIcon width={64} height={96} showAccent={false} />,
  },
];

export default function ServicesSection() {
  return (
    <section className="section-cream">
      <div
        className="grid grid-cols-1 md:grid-cols-2"
        style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
      >
        {cards.map((card, i) => (
          <div
            key={card.title}
            className="p-8 lg:p-10 flex flex-col gap-5"
            style={{
              borderRight: i < cards.length - 1 ? "1px solid rgba(0,0,0,0.08)" : undefined,
              borderBottom: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <SectionLabelNumber number={card.num} />

            {/* Icon */}
            <div className="relative flex items-end" style={{ minHeight: 120 }}>
              <div className="absolute inset-0 flex items-center justify-center opacity-80">
                <NeonHighlightStroke variant="square" width={110} opacity={0.7} />
              </div>
              <div className="relative z-10">{card.icon}</div>
            </div>

            <h3
              className="font-display text-kiddo-black"
              style={{ fontSize: "clamp(1.4rem,2vw,1.8rem)", lineHeight: 1 }}
            >
              {card.title}
            </h3>

            <p className="font-body text-sm text-black/50 leading-relaxed flex-1">
              {card.body}
            </p>

            <SmallTextArrowLink label={card.linkLabel} href={card.link} />
          </div>
        ))}
      </div>
    </section>
  );
}
