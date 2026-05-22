"use client";
import {
  HandwrittenWord,
  CollagePhotoFrame,
  kiddoColors,
} from "@/components/kiddo-assets";

const amenities = [
  { label: "CONNECTIVITY", value: "HIGH-SPEED WIFI" },
  { label: "FACILITIES", value: "CHANGING ROOM" },
  { label: "KITCHEN", value: "KITCHENETTE" },
  { label: "LOGISTICS", value: "LOADING DOCK" },
  { label: "TRANSPORT", value: "FREE PARKING" },
  { label: "CLIMATE", value: "AC + HEATING" },
  { label: "AUDIO", value: "SOUND SYSTEM" },
  { label: "BEAUTY", value: "MAKE-UP STATION" },
  { label: "STORAGE", value: "STORAGE LOCKERS" },
];

export default function StudioAmenitiesSection() {
  return (
    <section className="section-dark overflow-hidden">
      <div className="kiddo-container py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-12 lg:gap-16 items-center">
          {/* Left — text + amenities */}
          <div className="flex flex-col gap-8">
            {/* Label */}
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/30">
              WHAT&apos;S INCLUDED
            </p>

            {/* Headline */}
            <h2
              className="font-display text-white leading-none"
              style={{ fontSize: "clamp(2.5rem,5vw,5rem)" }}
            >
              <span className="block">EVERYTHING YOU NEED.</span>
              <span className="block">
                <HandwrittenWord
                  text="NOTHING YOU DON'T."
                  color={kiddoColors.lime}
                  fontSize="inherit"
                />
              </span>
            </h2>

            {/* Amenities grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
              {amenities.map((item) => (
                <div key={item.value} className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-white/30">
                    {item.label}
                  </span>
                  <span
                    className="font-display text-white"
                    style={{ fontSize: "clamp(0.9rem,1.5vw,1.1rem)", lineHeight: 1.2 }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — photo */}
          <div className="flex items-center justify-center">
            <CollagePhotoFrame
              src="/images/hero-camera.jpg"
              alt="Filmmaker at Kiddo Studio"
              rotation={-3}
              tape="top"
              tapeColor="yellow"
              width={280}
              height={350}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
