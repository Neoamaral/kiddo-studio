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
import { useIsMobile } from "@/hooks/useIsMobile";

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
    <span className="font-body text-[13px] text-black/50 max-w-[160px] leading-snug">{step.desc}</span>
  </>
);

export default function ProcessSection() {
  const isMobile = useIsMobile();
  return (
    <section className="section-cream py-20 lg:py-32">
      <div className="kiddo-container flex flex-col items-center">

        {/* Header — always centered */}
        <div className="mb-12 lg:mb-16 flex flex-col items-center gap-1 text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-black/40">
            HOW IT WORKS — IT&apos;S
          </p>
          <div className="flex items-end justify-center gap-3">
            <HandwrittenWord text="easy." fontSize={isMobile ? 44 : 80} rotation={-4} color={kiddoColors.black} />
            <div className="mb-4">
              <BrushUnderline variant="short" width={130} color={kiddoColors.lime} />
            </div>
          </div>
        </div>

        {/* Mobile: vertical stack centered */}
        <div className="flex flex-col items-center gap-0 w-full sm:hidden">
          {steps.map((step, i) => (
            <div key={step.num} className="flex flex-col items-center">
              {step.href ? (
                <Link href={step.href} className="flex flex-col items-center text-center px-6 py-2 hover:opacity-80 transition-opacity">
                  {stepContent(step)}
                </Link>
              ) : (
                <div className="flex flex-col items-center text-center px-6 py-2">
                  {stepContent(step)}
                </div>
              )}
              {i < steps.length - 1 && (
                <div className="my-3 rotate-90">
                  <ScribbleArrowIcon variant="right" width={48} height={20} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop: horizontal row */}
        <div className="hidden sm:flex items-center justify-center gap-0">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-center gap-0">
              {step.href ? (
                <Link href={step.href} className="w-[170px] lg:w-[190px] flex flex-col items-center gap-0 text-center px-4 py-2 hover:opacity-80 transition-opacity">
                  {stepContent(step)}
                </Link>
              ) : (
                <div className="w-[170px] lg:w-[190px] flex flex-col items-center gap-0 text-center px-4 py-2">
                  {stepContent(step)}
                </div>
              )}
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
