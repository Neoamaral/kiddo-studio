"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  HandwrittenWord,
  SmileyFaceIcon,
  CalendarSketchIcon,
  TapeStrip,
  kiddoColors,
} from "@/components/kiddo-assets";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddonState {
  coord: boolean;
  mu: boolean;
  cam: boolean;
  light: boolean;
  park: boolean;
  stor: boolean;
}

interface BookingFormData {
  name: string;
  email: string;
  company: string;
  crewSize: string;
  brief: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const SPACE_OPTIONS = [
  {
    id: "cyc",
    label: "CYCLORAMA",
    price: "+0€",
    desc: "Seamless white wall, drive-in ready.",
    img: "/images/space-cyclorama.jpg",
  },
  {
    id: "blk",
    label: "BLACK BOX",
    price: "+40€",
    desc: "Black-out, smoke-ready, UV rig.",
    img: "/images/space-black-box.jpg",
  },
  {
    id: "both",
    label: "BOTH",
    price: "+80€",
    desc: "Use the full studio. All day.",
    img: "/images/space-creative.jpg",
  },
];

const TIME_SLOTS = [
  {
    id: "am",
    label: "MORNING",
    time: "08:00 — 12:00",
    note: "Best light through east windows",
  },
  {
    id: "pm",
    label: "AFTERNOON",
    time: "13:00 — 17:00",
    note: "Tungsten balanced inside",
  },
  {
    id: "ev",
    label: "EVENING",
    time: "18:00 — 22:00",
    note: "Dark room only after sunset",
  },
  {
    id: "fd",
    label: "FULL DAY",
    time: "08:00 — 19:00",
    note: "11 hours · best value",
  },
];

const ADDON_OPTIONS = [
  { id: "coord", label: "Production coordinator", price: 180 },
  { id: "mu", label: "Makeup station + mirror", price: 30 },
  { id: "cam", label: "Camera bundle (FX6 + 3 lenses)", price: 240 },
  { id: "light", label: "Lighting bundle (3× Aputure)", price: 180 },
  { id: "park", label: "Parking (2 cars)", price: 20 },
  { id: "stor", label: "Overnight set hold", price: 100 },
];

const STEP_LABELS = ["DATE", "SLOT", "SPACE", "ADD-ONS", "DETAILS"];

// Calendar config for November 2026
const CAL_START_DOW = 0; // Nov 1 = Sunday
const CAL_DAYS = 30;
const CAL_BLOCKED = [3, 4, 10, 17, 18, 23, 24];
const CAL_TODAY = 8;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// ─── Booking Calendar ─────────────────────────────────────────────────────────

function BookingCalendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: number | null;
  onSelect: (d: number) => void;
}) {
  const blanks = Array.from({ length: CAL_START_DOW });
  const days = Array.from({ length: CAL_DAYS }, (_, i) => i + 1);

  return (
    <div style={{ width: "100%" }}>
      {/* Month header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
            fontSize: 22,
            color: kiddoColors.black,
          }}
        >
          November 2026
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.4)",
          }}
        >
          {days.filter((d) => !CAL_BLOCKED.includes(d)).length} DAYS AVAILABLE
        </span>
      </div>

      {/* Day-of-week row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginBottom: 6,
        }}
      >
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(0,0,0,0.35)",
              padding: "4px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
        }}
      >
        {blanks.map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const isBlocked = CAL_BLOCKED.includes(day);
          const isToday = day === CAL_TODAY;
          const isSelected = selectedDate === day;
          const isPast = day < CAL_TODAY;

          return (
            <button
              key={day}
              disabled={isBlocked || isPast}
              onClick={() => !isBlocked && !isPast && onSelect(day)}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                aspectRatio: "1",
                borderRadius: 0,
                border: isSelected
                  ? `1.5px solid ${kiddoColors.black}`
                  : "1.5px solid transparent",
                background: isSelected
                  ? kiddoColors.lime
                  : isToday
                  ? "rgba(200,232,32,0.15)"
                  : "transparent",
                cursor: isBlocked || isPast ? "default" : "pointer",
                opacity: isBlocked || isPast ? 0.3 : 1,
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: isSelected ? kiddoColors.black : kiddoColors.black,
                fontWeight: isToday ? 700 : 400,
                transition: "all 0.12s",
                padding: "6px 2px 4px",
              }}
            >
              {day}
              {/* Available dot */}
              {!isBlocked && !isPast && !isSelected && (
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: kiddoColors.lime,
                    display: "block",
                    marginTop: 2,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: kiddoColors.lime,
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.45)",
          }}
        >
          Available
        </span>
        <span
          style={{
            width: 6,
            height: 6,
            background: "rgba(0,0,0,0.15)",
            display: "inline-block",
            marginLeft: 8,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.45)",
          }}
        >
          Blocked
        </span>
      </div>
    </div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({
  number,
  label,
  isActive,
  children,
}: {
  number: string;
  label: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: isActive
          ? `1.5px solid ${kiddoColors.black}`
          : "1.5px solid rgba(0,0,0,0.12)",
        background: isActive ? "#fff" : "rgba(255,255,255,0.4)",
        padding: "28px 28px",
        transition: "all 0.2s",
      }}
    >
      {/* Step header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: isActive ? 24 : 0,
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            border: `1.5px solid ${isActive ? kiddoColors.black : "rgba(0,0,0,0.3)"}`,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.1em",
            color: isActive ? kiddoColors.black : "rgba(0,0,0,0.4)",
            flexShrink: 0,
          }}
        >
          {number}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: isActive ? kiddoColors.black : "rgba(0,0,0,0.4)",
          }}
        >
          {label}
        </span>
      </div>
      {isActive && children}
    </div>
  );
}

// ─── Booking Summary (sidebar) ────────────────────────────────────────────────

function BookingSummary({
  selectedDate,
  slot,
  space,
  addons,
  formData,
  onSubmit,
  isSubmitting,
}: {
  selectedDate: number | null;
  slot: string;
  space: string;
  addons: AddonState;
  formData: BookingFormData;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const basePrice = slot === "fd" ? 280 : 140;
  const spaceUp = space === "blk" ? 40 : space === "both" ? 80 : 0;
  const addonTotal = (Object.entries(addons) as [keyof AddonState, boolean][])
    .filter(([, v]) => v)
    .reduce(
      (sum, [k]) =>
        sum + (ADDON_OPTIONS.find((a) => a.id === k)?.price || 0),
      0
    );
  const total = basePrice + spaceUp + addonTotal;

  const slotObj = TIME_SLOTS.find((t) => t.id === slot);
  const spaceObj = SPACE_OPTIONS.find((s) => s.id === space);
  const activeAddons = (Object.entries(addons) as [keyof AddonState, boolean][])
    .filter(([, v]) => v)
    .map(([k]) => ADDON_OPTIONS.find((a) => a.id === k)!);

  const canConfirm =
    !!formData.name.trim() && !!formData.email.trim() && !!selectedDate && !!slot && !!space;

  return (
    <div
      style={{
        background: kiddoColors.nearBlack,
        color: "#fff",
        padding: "28px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Tape strip decoration */}
      <div
        style={{
          position: "absolute",
          top: -8,
          right: 24,
          zIndex: 2,
        }}
      >
        <TapeStrip variant="yellow" width={100} height={24} rotation={-3} />
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, marginTop: 12 }}>
        <CalendarSketchIcon width={36} color={kiddoColors.lime} />
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 3,
            }}
          >
            Your Booking
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              color: "#fff",
            }}
          >
            {selectedDate ? `Nov ${selectedDate}, 2026` : "No date selected"}
          </div>
        </div>
      </div>

      {/* Summary rows */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <SummaryRow
          label="Slot"
          value={slotObj ? `${slotObj.label} · ${slotObj.time}` : "—"}
        />
        <SummaryRow
          label="Space"
          value={spaceObj ? spaceObj.label : "—"}
        />
        <SummaryRow
          label="Crew"
          value={formData.crewSize || "—"}
        />
      </div>

      {/* Pricing */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <PriceRow
          label={`Base · ${slotObj ? slotObj.label : "Half day"}`}
          value={`${basePrice}€`}
        />
        {spaceUp > 0 && (
          <PriceRow
            label={`Space upgrade · ${spaceObj?.label}`}
            value={`+${spaceUp}€`}
          />
        )}
        {activeAddons.map((a) => (
          <PriceRow key={a.id} label={a.label} value={`+${a.price}€`} />
        ))}
      </div>

      {/* Total */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.15)",
          paddingTop: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
            marginBottom: 6,
          }}
        >
          Total
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 56,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: kiddoColors.lime,
          }}
        >
          {total}€
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onSubmit}
        disabled={!canConfirm || isSubmitting}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          background: canConfirm && !isSubmitting ? kiddoColors.lime : "rgba(255,255,255,0.1)",
          color: canConfirm && !isSubmitting ? kiddoColors.black : "rgba(255,255,255,0.3)",
          padding: "14px 22px",
          border: `1px solid ${canConfirm && !isSubmitting ? kiddoColors.black : "rgba(255,255,255,0.1)"}`,
          cursor: canConfirm && !isSubmitting ? "pointer" : "not-allowed",
          width: "100%",
          transition: "all 0.15s",
        }}
      >
        {isSubmitting ? "SENDING..." : "CONFIRM BOOKING →"}
      </button>

      {!canConfirm && (
        <div
          style={{
            marginTop: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
            textAlign: "center",
          }}
        >
          Fill name + email to confirm
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 12,
          color: "rgba(255,255,255,0.85)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.1em",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Success Card ─────────────────────────────────────────────────────────────

function SuccessCard({ bookingRef }: { bookingRef: string }) {
  return (
    <div
      style={{
        background: kiddoColors.lime,
        border: `2px solid ${kiddoColors.black}`,
        padding: "36px 28px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      <SmileyFaceIcon variant="drip" width={80} fill={kiddoColors.black} />
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 32,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
          color: kiddoColors.black,
          lineHeight: 1,
        }}
      >
        YOU&apos;RE BOOKED!
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "rgba(0,0,0,0.5)",
        }}
      >
        Ref: {bookingRef}
      </div>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "rgba(0,0,0,0.7)",
          maxWidth: 260,
          lineHeight: 1.5,
        }}
      >
        We&apos;ll send a confirmation email shortly. See you in the studio!
      </p>
      <a
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          background: kiddoColors.black,
          color: "#fff",
          padding: "12px 22px",
          border: `1px solid ${kiddoColors.black}`,
          marginTop: 4,
          textDecoration: "none",
        }}
      >
        ← BACK HOME
      </a>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function BookingPageClient() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [slot, setSlot] = useState("");
  const [space, setSpace] = useState("");
  const [addons, setAddons] = useState<AddonState>({
    coord: false,
    mu: false,
    cam: false,
    light: false,
    park: false,
    stor: false,
  });
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    company: "",
    crewSize: "",
    brief: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState<string | null>(null);

  const toggleAddon = (id: keyof AddonState) => {
    setAddons((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          crewSize: formData.crewSize,
          brief: formData.brief,
          date: selectedDate ? `Nov ${selectedDate}, 2026` : null,
          slot,
          space,
          addons,
          total: (() => {
            const basePrice = slot === "fd" ? 280 : 140;
            const spaceUp = space === "blk" ? 40 : space === "both" ? 80 : 0;
            const addonTotal = (Object.entries(addons) as [keyof AddonState, boolean][])
              .filter(([, v]) => v)
              .reduce(
                (sum, [k]) =>
                  sum + (ADDON_OPTIONS.find((a) => a.id === k)?.price || 0),
                0
              );
            return basePrice + spaceUp + addonTotal;
          })(),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { ref?: string };
        setBookingRef(data.ref || `KID-${Date.now().toString(36).toUpperCase()}`);
      } else {
        setBookingRef(`KID-${Date.now().toString(36).toUpperCase()}`);
      }
    } catch {
      setBookingRef(`KID-${Date.now().toString(36).toUpperCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section
        style={{
          background: "#F2EFE6",
          color: "#1A1A1A",
          paddingTop: "clamp(3rem, 8vw, 6rem)",
          paddingBottom: "clamp(2rem, 5vw, 4rem)",
        }}
      >
        <div className="kiddo-container">
          {/* Label */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(0,0,0,0.4)",
              marginBottom: 20,
            }}
          >
            Studio Booking
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              fontSize: "clamp(3rem, 7vw, 6rem)",
              lineHeight: 1,
              maxWidth: 900,
            }}
          >
            PICK A DAY.{" "}
            <HandwrittenWord
              text="we'll handle"
              color={kiddoColors.lime}
              fontSize={80}
            />{" "}
            THE REST.
          </h1>
        </div>
      </section>

      {/* ── BOOKING FLOW ──────────────────────────────────────────── */}
      <section
        style={{
          background: "#F2EFE6",
          color: "#1A1A1A",
          paddingBottom: "clamp(4rem, 8vw, 8rem)",
        }}
      >
        <div className="kiddo-container">
          {/* Stepper bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              marginBottom: 36,
              borderTop: "1px solid rgba(0,0,0,0.12)",
              borderBottom: "1px solid rgba(0,0,0,0.12)",
              padding: "12px 0",
              overflowX: "auto",
            }}
          >
            {STEP_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => setActiveStep(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderRight:
                    i < STEP_LABELS.length - 1
                      ? "1px solid rgba(0,0,0,0.1)"
                      : "none",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    border: `1.5px solid ${activeStep === i ? kiddoColors.black : "rgba(0,0,0,0.25)"}`,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                    letterSpacing: "0.05em",
                    color: activeStep === i ? kiddoColors.black : "rgba(0,0,0,0.35)",
                    background:
                      activeStep === i ? kiddoColors.lime : "transparent",
                    transition: "all 0.15s",
                    flexShrink: 0,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color:
                      activeStep === i
                        ? kiddoColors.black
                        : "rgba(0,0,0,0.35)",
                    transition: "color 0.15s",
                  }}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* 2-col layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr",
              gap: 32,
              alignItems: "start",
            }}
          >
            {/* LEFT: Steps */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {/* Step 01 — Pick a Date */}
              <StepCard
                number="01"
                label="PICK A DATE"
                isActive={activeStep === 0}
              >
                <BookingCalendar
                  selectedDate={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d);
                    setActiveStep(1);
                  }}
                />
              </StepCard>

              {/* Step 02 — Time Slot */}
              <StepCard number="02" label="WHEN?" isActive={activeStep === 1}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {TIME_SLOTS.map((ts) => {
                    const isSelected = slot === ts.id;
                    return (
                      <button
                        key={ts.id}
                        onClick={() => {
                          setSlot(ts.id);
                          setActiveStep(2);
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          padding: "16px 16px",
                          border: isSelected
                            ? `1.5px solid ${kiddoColors.black}`
                            : "1.5px solid rgba(0,0,0,0.15)",
                          background: isSelected ? kiddoColors.lime : "#fff",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.12s",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 18,
                            textTransform: "uppercase",
                            letterSpacing: "-0.01em",
                            color: kiddoColors.black,
                          }}
                        >
                          {ts.label}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "rgba(0,0,0,0.55)",
                            marginTop: 4,
                          }}
                        >
                          {ts.time}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: 11,
                            color: "rgba(0,0,0,0.45)",
                            marginTop: 6,
                          }}
                        >
                          {ts.note}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </StepCard>

              {/* Step 03 — Space */}
              <StepCard
                number="03"
                label="WHICH SPACE?"
                isActive={activeStep === 2}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                  }}
                >
                  {SPACE_OPTIONS.map((sp) => {
                    const isSelected = space === sp.id;
                    return (
                      <button
                        key={sp.id}
                        onClick={() => {
                          setSpace(sp.id);
                          setActiveStep(3);
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          border: isSelected
                            ? `2px solid ${kiddoColors.black}`
                            : "2px solid transparent",
                          background: "transparent",
                          cursor: "pointer",
                          overflow: "hidden",
                          transition: "all 0.12s",
                          padding: 0,
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "4/3",
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          <img
                            src={sp.img}
                            alt={sp.label}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              filter: isSelected
                                ? "none"
                                : "grayscale(100%) opacity(0.7)",
                              transition: "filter 0.2s",
                            }}
                          />
                          {isSelected && (
                            <div
                              style={{
                                position: "absolute",
                                top: 6,
                                right: 6,
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: kiddoColors.lime,
                                border: `1.5px solid ${kiddoColors.black}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              ✓
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            padding: "10px 10px",
                            background: isSelected
                              ? kiddoColors.lime
                              : "#fff",
                            textAlign: "left",
                            borderTop: `1px solid ${kiddoColors.black}`,
                            width: "100%",
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: 14,
                              textTransform: "uppercase",
                              letterSpacing: "-0.01em",
                              color: kiddoColors.black,
                            }}
                          >
                            {sp.label}
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 9,
                              letterSpacing: "0.15em",
                              textTransform: "uppercase",
                              color: "rgba(0,0,0,0.5)",
                              marginTop: 2,
                            }}
                          >
                            {sp.price}
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-body)",
                              fontSize: 10,
                              color: "rgba(0,0,0,0.5)",
                              marginTop: 4,
                              lineHeight: 1.4,
                            }}
                          >
                            {sp.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </StepCard>

              {/* Step 04 — Add-ons */}
              <StepCard
                number="04"
                label="WANT EXTRAS?"
                isActive={activeStep === 3}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {ADDON_OPTIONS.map((addon) => {
                    const checked = addons[addon.id as keyof AddonState];
                    return (
                      <label
                        key={addon.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "12px 14px",
                          border: checked
                            ? `1.5px solid ${kiddoColors.black}`
                            : "1.5px solid rgba(0,0,0,0.12)",
                          background: checked
                            ? "rgba(200,232,32,0.12)"
                            : "#fff",
                          cursor: "pointer",
                          transition: "all 0.12s",
                        }}
                      >
                        {/* Custom checkbox */}
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            border: `1.5px solid ${checked ? kiddoColors.black : "rgba(0,0,0,0.3)"}`,
                            background: checked ? kiddoColors.lime : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.12s",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {checked && "✓"}
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleAddon(addon.id as keyof AddonState)
                          }
                          style={{ display: "none" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontFamily: "var(--font-body)",
                              fontSize: 12,
                              color: kiddoColors.black,
                              lineHeight: 1.3,
                            }}
                          >
                            {addon.label}
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 9,
                              letterSpacing: "0.15em",
                              textTransform: "uppercase",
                              color: "rgba(0,0,0,0.4)",
                              marginTop: 2,
                            }}
                          >
                            +{addon.price}€
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <button
                  onClick={() => setActiveStep(4)}
                  style={{
                    marginTop: 16,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    background: "transparent",
                    border: `1px solid rgba(0,0,0,0.25)`,
                    padding: "10px 18px",
                    cursor: "pointer",
                    color: "rgba(0,0,0,0.5)",
                    transition: "all 0.12s",
                  }}
                >
                  CONTINUE →
                </button>
              </StepCard>

              {/* Step 05 — Details */}
              <StepCard
                number="05"
                label="YOUR DETAILS"
                isActive={activeStep === 4}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                  }}
                >
                  {/* Name */}
                  <div>
                    <label
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "rgba(0,0,0,0.5)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Your name"
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "14px 0",
                        fontFamily: "var(--font-body)",
                        fontSize: 14,
                        color: kiddoColors.black,
                        background: "transparent",
                        border: 0,
                        borderBottom: "1px solid rgba(0,0,0,0.25)",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "rgba(0,0,0,0.5)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="you@studio.com"
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "14px 0",
                        fontFamily: "var(--font-body)",
                        fontSize: 14,
                        color: kiddoColors.black,
                        background: "transparent",
                        border: 0,
                        borderBottom: "1px solid rgba(0,0,0,0.25)",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "rgba(0,0,0,0.5)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      Company / Production House
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, company: e.target.value }))
                      }
                      placeholder="Optional"
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "14px 0",
                        fontFamily: "var(--font-body)",
                        fontSize: 14,
                        color: kiddoColors.black,
                        background: "transparent",
                        border: 0,
                        borderBottom: "1px solid rgba(0,0,0,0.25)",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Crew size */}
                  <div>
                    <label
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "rgba(0,0,0,0.5)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      Crew Size
                    </label>
                    <select
                      value={formData.crewSize}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          crewSize: e.target.value,
                        }))
                      }
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "14px 0",
                        fontFamily: "var(--font-body)",
                        fontSize: 14,
                        color: formData.crewSize
                          ? kiddoColors.black
                          : "rgba(0,0,0,0.4)",
                        background: "transparent",
                        border: 0,
                        borderBottom: "1px solid rgba(0,0,0,0.25)",
                        outline: "none",
                        appearance: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="" disabled>
                        Select crew size
                      </option>
                      <option value="1–3">1–3 people</option>
                      <option value="4–8">4–8 people</option>
                      <option value="9–15">9–15 people</option>
                      <option value="15+">15+ people</option>
                    </select>
                  </div>

                  {/* Brief */}
                  <div>
                    <label
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "rgba(0,0,0,0.5)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      Brief / Notes
                    </label>
                    <textarea
                      value={formData.brief}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, brief: e.target.value }))
                      }
                      placeholder="Tell us about the shoot — format, mood, references..."
                      rows={4}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "14px 0",
                        fontFamily: "var(--font-body)",
                        fontSize: 14,
                        color: kiddoColors.black,
                        background: "transparent",
                        border: 0,
                        borderBottom: "1px solid rgba(0,0,0,0.25)",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>
              </StepCard>
            </div>

            {/* RIGHT: Sticky Sidebar */}
            <div style={{ position: "sticky", top: 88 }}>
              {bookingRef ? (
                <SuccessCard bookingRef={bookingRef} />
              ) : (
                <BookingSummary
                  selectedDate={selectedDate}
                  slot={slot}
                  space={space}
                  addons={addons}
                  formData={formData}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
