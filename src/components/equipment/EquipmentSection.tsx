"use client";
import { HandwrittenWord, kiddoColors } from "@/components/kiddo-assets";

const equipmentCategories = [
  {
    category: "LIGHTING",
    items: [
      "Profoto B10 Strobe ×2",
      "Aputure 300D LED",
      "LED Panel ×4",
      "Softbox 90×90",
      "Beauty Dish",
      "Reflectors & Flags",
    ],
  },
  {
    category: "GRIP",
    items: [
      "C-Stands ×6",
      "Boom Arms ×2",
      "Light Stands ×8",
      "Sandbags",
      "Clamps & Hardware",
      "Apple Boxes",
    ],
  },
  {
    category: "BACKDROPS",
    items: [
      "Seamless White Paper",
      "Seamless Black Paper",
      "Grey Muslin",
      "Vintage Textures",
      "Coloured Gels",
      "Portable Cyclorama",
    ],
  },
  {
    category: "CAMERA",
    items: [
      "Sony A7 IV (request)",
      "Tripods ×3",
      "Sliders & Dollies",
      "HDMI Monitors",
      "Tether Station",
      "Card Readers",
    ],
  },
  {
    category: "AUDIO",
    items: [
      "Rode NTG3 Shotgun",
      "Zoom H6 Recorder",
      "Lavalier Mics ×4",
      "Boom Pole",
      "Studio Monitors",
      "Bluetooth Speaker",
    ],
  },
  {
    category: "EXTRAS",
    items: [
      "Make-up Station",
      "Full-length Mirrors ×2",
      "Steamer",
      "Fan (large)",
      "Cold Brew Machine",
      "Portable Heater",
    ],
  },
];

export default function EquipmentSection() {
  return (
    <>
      {/* ── Hero: dark ── */}
      <section className="section-dark">
        <div className="kiddo-container py-16 lg:py-20">
          <p className="font-mono text-[10px] tracking-widest uppercase text-white/30 mb-4">
            EQUIPMENT
          </p>
          <h1
            className="font-display text-white leading-none"
            style={{ fontSize: "clamp(3rem,5vw,5.5rem)" }}
          >
            WE&apos;VE GOT{" "}
            <HandwrittenWord
              text="WHAT YOU NEED."
              color={kiddoColors.lime}
              fontSize="inherit"
            />
          </h1>
          <p className="font-body text-white/50 text-[15px] leading-relaxed mt-6 max-w-xl">
            Our equipment is available as an add-on to any studio booking. Not sure what you
            need? Just ask — we&apos;ll figure it out together.
          </p>
        </div>
      </section>

      {/* ── Grid: cream ── */}
      <section className="section-cream">
        <div className="kiddo-container py-14 lg:py-20">
          <p className="font-mono text-[10px] tracking-widest uppercase text-black/40 mb-8">
            AVAILABLE GEAR
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
            {equipmentCategories.map((cat) => (
              <div
                key={cat.category}
                className="p-8 lg:p-10 flex flex-col gap-4"
                style={{
                  borderRight: "1px solid rgba(0,0,0,0.08)",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-black/40">
                  {cat.category}
                </p>
                <ul className="flex flex-col gap-1">
                  {cat.items.map((item) => (
                    <li
                      key={item}
                      className="font-body text-[13px] text-black/60 flex items-center gap-2"
                    >
                      <span
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: kiddoColors.lime }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Note box */}
          <div className="mt-8 p-6" style={{ background: kiddoColors.lime }}>
            <p className="font-mono text-[10px] tracking-widest uppercase text-black/60 mb-2">
              IMPORTANT
            </p>
            <p className="font-body text-[14px] text-kiddo-black">
              Equipment availability varies. Please mention your needs when booking and we&apos;ll
              confirm what&apos;s available. Pricing on request — most items are included or have
              a small add-on fee.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
