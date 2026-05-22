"use client";
import { useState } from "react";
import {
  HandwrittenWord,
  HandDrawnStarIcon,
  CircularBadgeSeal,
  kiddoColors,
} from "@/components/kiddo-assets";

const darkInputClass =
  "w-full bg-transparent border-b border-white/20 py-3 font-body text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors";

const selectClass =
  "w-full bg-transparent border-b border-white/20 py-3 font-body text-[15px] text-white focus:outline-none focus:border-white transition-colors appearance-none cursor-pointer";

interface BookingForm {
  name: string;
  email: string;
  phone: string;
  date: string;
  space: string;
  duration: string;
  crewSize: string;
  message: string;
}

export default function BookingFormSection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [form, setForm] = useState<BookingForm>({
    name: "",
    email: "",
    phone: "",
    date: "",
    space: "",
    duration: "",
    crewSize: "",
    message: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="section-dark">
      <div className="kiddo-container py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-12">

          {/* ── Left col: form ── */}
          <div>
            <p className="font-mono text-[10px] tracking-widest uppercase text-white/30 mb-4">
              RESERVE YOUR SPACE
            </p>
            <h1
              className="font-display text-white leading-none mb-8"
              style={{ fontSize: "clamp(3rem,5vw,5rem)" }}
            >
              BOOK THE{" "}
              <HandwrittenWord text="STUDIO." color={kiddoColors.lime} fontSize="inherit" />
            </h1>

            {status === "success" ? (
              <div className="flex flex-col gap-4 py-16">
                <HandDrawnStarIcon width={60} height={60} color={kiddoColors.lime} />
                <h3
                  className="font-display text-white"
                  style={{ fontSize: "clamp(2rem,4vw,3rem)" }}
                >
                  BOOKING REQUEST SENT.
                </h3>
                <p className="font-body text-white/60 text-[15px]">
                  We&apos;ll confirm your session within 24 hours. Check your email.
                </p>
                <a
                  href="/"
                  className="font-mono text-[11px] tracking-widest uppercase text-white/40 hover:text-white mt-4"
                >
                  ← BACK TO HOME
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Name */}
                <div>
                  <label className="font-mono text-[9px] tracking-widest uppercase text-white/30 block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Your full name"
                    value={form.name}
                    onChange={handleChange}
                    className={darkInputClass}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="font-mono text-[9px] tracking-widest uppercase text-white/30 block mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={handleChange}
                    className={darkInputClass}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="font-mono text-[9px] tracking-widest uppercase text-white/30 block mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="+351 000 000 000"
                    value={form.phone}
                    onChange={handleChange}
                    className={darkInputClass}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="font-mono text-[9px] tracking-widest uppercase text-white/30 block mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    value={form.date}
                    onChange={handleChange}
                    className={darkInputClass}
                    style={{ colorScheme: "dark" }}
                  />
                </div>

                {/* Space */}
                <div>
                  <label className="font-mono text-[9px] tracking-widest uppercase text-white/30 block mb-1">
                    Space *
                  </label>
                  <select
                    name="space"
                    required
                    value={form.space}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="" disabled style={{ background: "#111" }}>
                      Select a space
                    </option>
                    <option value="Cyclorama" style={{ background: "#111" }}>Cyclorama</option>
                    <option value="Black Box" style={{ background: "#111" }}>Black Box</option>
                    <option value="Creative Area" style={{ background: "#111" }}>Creative Area</option>
                    <option value="Prop Room" style={{ background: "#111" }}>Prop Room</option>
                    <option value="Multiple Spaces" style={{ background: "#111" }}>Multiple Spaces</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="font-mono text-[9px] tracking-widest uppercase text-white/30 block mb-1">
                    Duration *
                  </label>
                  <select
                    name="duration"
                    required
                    value={form.duration}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="" disabled style={{ background: "#111" }}>
                      Select duration
                    </option>
                    <option value="2 Hours (80€)" style={{ background: "#111" }}>2 Hours (80€)</option>
                    <option value="Half Day 4h (140€)" style={{ background: "#111" }}>Half Day 4h (140€)</option>
                    <option value="Full Day 8h (280€)" style={{ background: "#111" }}>Full Day 8h (280€)</option>
                  </select>
                </div>

                {/* Crew Size */}
                <div>
                  <label className="font-mono text-[9px] tracking-widest uppercase text-white/30 block mb-1">
                    Crew Size
                  </label>
                  <select
                    name="crewSize"
                    value={form.crewSize}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="" style={{ background: "#111" }}>Select crew size</option>
                    <option value="1-3 people" style={{ background: "#111" }}>1–3 people</option>
                    <option value="4-8 people" style={{ background: "#111" }}>4–8 people</option>
                    <option value="9-15 people" style={{ background: "#111" }}>9–15 people</option>
                    <option value="15+ people" style={{ background: "#111" }}>15+ people</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="font-mono text-[9px] tracking-widest uppercase text-white/30 block mb-1">
                    Project Description
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    placeholder="Tell us about your project (optional)"
                    value={form.message}
                    onChange={handleChange}
                    className={darkInputClass + " resize-none"}
                  />
                </div>

                {status === "error" && (
                  <p className="font-mono text-[10px] tracking-widest uppercase text-red-400">
                    SOMETHING WENT WRONG. PLEASE TRY AGAIN.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="self-start font-mono text-[11px] tracking-[0.15em] uppercase bg-kiddo-lime text-kiddo-black px-6 py-3 hover:bg-white hover:text-kiddo-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? "SENDING..." : "REQUEST BOOKING →"}
                </button>
              </form>
            )}
          </div>

          {/* ── Right col: pricing ── */}
          <div className="flex flex-col">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/30 mb-6">
              PRICING REFERENCE
            </p>

            {[
              { label: "HOURLY", price: "40€/h", note: "min 2 hours" },
              { label: "HALF DAY", price: "140€", note: "4 hours" },
              { label: "FULL DAY", price: "280€", note: "8 hours" },
            ].map((p) => (
              <div
                key={p.label}
                className="py-6"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p className="font-mono text-[10px] tracking-widest uppercase text-white/30">
                  {p.label}
                </p>
                <p
                  className="font-display text-white mt-1"
                  style={{ fontSize: "clamp(2rem,3vw,3rem)", lineHeight: 1 }}
                >
                  {p.price}
                </p>
                <p className="font-mono text-[9px] tracking-widest text-white/20 mt-1">
                  {p.note}
                </p>
              </div>
            ))}

            <div className="mt-8">
              <CircularBadgeSeal
                size={90}
                spinning
                color={kiddoColors.lime}
                bgColor={kiddoColors.nearBlack}
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
