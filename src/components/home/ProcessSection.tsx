"use client";
import Link from "next/link";
import {
  HandwrittenWord,
  BrushUnderline,
  ScribbleArrowIcon,
  CalendarSketchIcon,
  DoorSketchIcon,
  SmileyFaceIcon,
  HandDrawnStarIcon,
  kiddoColors,
} from "@/components/kiddo-assets";
import { BOOKING_HREF } from "@/lib/site";

const steps = [
  {
    num: "01",
    title: "BOOK",
    desc: "Pick a date online in minutes.",
    icon: <CalendarSketchIcon width={88} height={96} />,
    href: BOOKING_HREF,
  },
  {
    num: "02",
    title: "SHOW UP",
    desc: "Arrive, get keys, and the space is yours.",
    icon: <DoorSketchIcon width={88} height={96} />,
    href: null,
  },
  {
    num: "03",
    title: "CREATE",
    desc: "Make the thing you've been dreaming about.",
    icon: <SmileyFaceIcon variant="drip" width={88} height={96} fill={kiddoColors.lime} />,
    href: null,
  },
  {
    num: "04",
    title: "SHARE",
    desc: "Put it out into the world. Repeat.",
    icon: <HandDrawnStarIcon width={88} height={88} color={kiddoColors.black} />,
    href: null,
  },
];

const stepContent = (step: (typeof steps)[0]) => (
  <>
    <div className="mb-4">{step.icon}</div>
    <span className="font-mono text-[11px] text-black/40 mb-1">{step.num}</span>
    <span className="font-display text-[1.6rem] text-kiddo-black leading-none mb-2">{step.title}</span>
    <span className="font-body text-[13px] text-black/50 max-w-[140px] leading-snug">{step.desc}</span>
  </>
);

export default function ProcessSection() {
  return (
    <section className="section-cream py-24 lg:py-32">
      <div className="kiddo-container flex flex-col items-center">

        {/* Top label — centered */}
        <div className="mb-14 flex flex-col items-center gap-1 text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-black/40">
            HOW IT WORKS — IT&apos;S
          </p>
          <div className="flex items-end gap-3">
            <HandwrittenWord text="easy." fontSize={80} rotation={-4} color={kiddoColors.black} />
            <div className="mb-4">
              <BrushUnderline variant="short" width={130} color={kiddoColors.lime} />
            </div>
          </div>
        </div>

        {/* Steps row — centered */}
        <div className="flex items-center justify-center gap-0 flex-wrap sm:flex-nowrap">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-center gap-0">
              {/* Step block */}
              {step.href ? (
                <Link
                  href={step.href}
                  className="w-[160px] sm:w-[180px] flex flex-col items-center gap-0 text-center px-4 py-2 hover:opacity-80 transition-opacity"
                >
                  {stepContent(step)}
                </Link>
              ) : (
                <div className="w-[160px] sm:w-[180px] flex flex-col items-center gap-0 text-center px-4 py-2">
                  {stepContent(step)}
                </div>
              )}

              {/* Arrow between steps */}
              {i < steps.length - 1 && (
                <div className="shrink-0 mb-10">
                  <ScribbleArrowIcon variant="right" width={56} height={24} />
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
