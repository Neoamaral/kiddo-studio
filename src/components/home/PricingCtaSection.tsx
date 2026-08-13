"use client";
import {
  HandwrittenWord,
  ScribbleArrowIcon,
  SmileyFaceIcon,
  SmallTextArrowLink,
  CollagePhotoFrame,
  CircularBadgeSeal,
  kiddoColors,
} from "@/components/kiddo-assets";
import { BOOKING_HREF } from "@/lib/site";
import { HOME_PRICING_ROWS } from "@/data/pricing";

export default function PricingCtaSection() {
  return (
    <section className="overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr_2fr]">
        {/* Left — lime CTA */}
        <div
          className="flex flex-col justify-between gap-6 p-10 lg:p-14"
          style={{ background: kiddoColors.lime }}
        >
          <div className="flex flex-col gap-4">
            <h2
              className="font-display text-kiddo-black"
              style={{ fontSize: "clamp(2rem,3.5vw,3.5rem)", lineHeight: 1 }}
            >
              READY TO CREATE SOMETHING
            </h2>
            <HandwrittenWord
              text="WEIRD?"
              color={kiddoColors.black}
              fontSize="clamp(2.5rem,4vw,4rem)"
            />
            <ScribbleArrowIcon variant="diagonal" color={kiddoColors.black} width={36} height={36} />
          </div>

          <div className="flex flex-col gap-4">
            <SmileyFaceIcon variant="clean" width={52} height={52} color={kiddoColors.black} strokeWidth={2} />
            <SmallTextArrowLink
              label="BOOK THE STUDIO"
              href={BOOKING_HREF}
              color={kiddoColors.black}
              underlineColor={kiddoColors.black}
            />
          </div>
        </div>

        {/* Center — pricing rows */}
        <div className="flex flex-col section-cream p-8 lg:p-10 divide-y divide-black/10">
          <p className="font-mono text-[9px] tracking-[0.25em] text-black/40 uppercase mb-2">
            PRICING
          </p>
          {HOME_PRICING_ROWS.map((row) => (
            <div key={row.title} className="py-6 flex items-center gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <span className="font-mono text-[10px] tracking-widest uppercase text-black/50">
                  {row.title}
                  {row.duration && (
                    <span className="ml-1 text-black/30">({row.duration})</span>
                  )}
                </span>
              </div>
              <span
                className="font-display text-kiddo-black"
                style={{ fontSize: "clamp(2rem,3.5vw,3.5rem)", lineHeight: 1 }}
              >
                {row.price}
              </span>
              <span className="font-body text-xs text-black/40 text-right max-w-[90px] leading-snug">
                {row.desc}
              </span>
            </div>
          ))}
          <div className="pt-4">
            <SmallTextArrowLink label="SEE ALL PRICING" href="/pricing" />
          </div>
        </div>

        {/* Right — photo + badge */}
        <div className="relative flex items-center justify-center section-dark p-8 min-h-[400px]">
          <CollagePhotoFrame
            src="/images/equipment-footer.jpg"
            alt="Studio equipment"
            blackAndWhite
            rotation={-3}
            tape="top"
            tapeColor="yellow"
            width={220}
            height={280}
          />
          {/* Badge overlapping bottom-right */}
          <div className="absolute bottom-6 right-6 z-20">
            <CircularBadgeSeal
              size={90}
              spinning
              color={kiddoColors.lime}
              bgColor="#111111"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
