"use client";
import { kiddoColors } from "@/components/kiddo-assets";

const stats = [
  { number: "500+", label: "PROJECTS SHOT" },
  { number: "4",    label: "UNIQUE SPACES" },
  { number: "1",    label: "CITY — LISBON" },
  { number: "∞",    label: "WEIRD IDEAS WELCOMED" },
];

export default function AboutNumbersSection() {
  return (
    <section className="section-dark">
      <div className="kiddo-container py-16 lg:py-20">
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/30 mb-10">
          BY THE NUMBERS
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="flex flex-col gap-2 py-8 px-4 lg:px-8"
              style={{
                borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.08)" : undefined,
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span
                className="font-display text-white leading-none"
                style={{
                  fontSize: "clamp(3rem,6vw,5.5rem)",
                  color: i === 0 ? kiddoColors.lime : "#fff",
                }}
              >
                {s.number}
              </span>
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
