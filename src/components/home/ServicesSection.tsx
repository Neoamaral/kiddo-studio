"use client";
import Link from "next/link";
import {
  SectionLabelNumber,
  NeonHighlightStroke,
  CameraSketchIcon,
  StoolSketchIcon,
  StudioLightSketchIcon,
  SmallTextArrowLink,
  kiddoColors,
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
    body: "Rent the space by the hour or full day. Everything you need, nothing you don't.",
    link: "/studio",
    linkLabel: "BOOK NOW",
    icon: <StoolSketchIcon width={64} height={96} showAccent={false} />,
  },
  {
    num: 3,
    title: "EQUIPMENT",
    body: "Lights, cameras, stands, backdrops. Rent individual items or full packages.",
    link: "/equipment",
    linkLabel: "SEE GEAR",
    icon: <StudioLightSketchIcon width={80} height={112} showAccent={false} />,
  },
  {
    num: 4,
    title: "ART DEPARTMENT",
    body: "Props, set design, and styling available. Build the world your story needs.",
    link: "/projects",
    linkLabel: "DISCOVER",
    img: "/images/art-collage.jpg",
  },
];

export default function ServicesSection() {
  return (
    <section className="section-cream">
      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
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

            {/* Icon or image */}
            <div className="relative flex items-end" style={{ minHeight: 120 }}>
              {card.icon ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center opacity-80">
                    <NeonHighlightStroke variant="square" width={110} opacity={0.7} />
                  </div>
                  <div className="relative z-10">{card.icon}</div>
                </>
              ) : (
                <img
                  src={card.img}
                  alt={card.title}
                  style={{
                    width: 180,
                    height: 140,
                    objectFit: "cover",
                    transform: "rotate(2deg)",
                    display: "block",
                  }}
                />
              )}
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
