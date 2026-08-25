"use client";

/**
 * Booking wizard: SPACE → DATE → SLOT → ADD-ONS → GEAR → DETAILS.
 *
 * Space comes first because each space has its own Google Calendar, so the date
 * step cannot know what to query until the space is known; the slot then needs
 * both; equipment stock is per-date.
 *
 * Orchestration only — the calendar, the pickers, the summary, the result cards
 * and the step machine each live in their own file.
 */

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { HandwrittenWord, kiddoColors } from "@/components/kiddo-assets";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAvailability, availabilityData } from "@/hooks/useAvailability";
import {
  ADDON_OPTIONS,
  BOOKING_HORIZON_DAYS,
  BOOKING_LEAD_TIME_DAYS,
  TIME_SLOTS,
  emptyAddonState,
  selectedAddonIds,
  slotTimeLabel,
} from "@/data/booking";
import { BOOKABLE_SPACES } from "@/data/spaces";
import type { DateBounds } from "@/data/availability";
import { equipmentRemaining, slotState } from "@/data/availability";
import { computeQuote } from "@/lib/quote";
import { eurSigned, rateAmount } from "@/lib/money";
import type { ISODate } from "@/lib/date";
import { addDays, formatDateHuman, monthKey, parseISO, todayInLisbon } from "@/lib/date";
import StepCard, { StepNav } from "./StepCard";
import BookingCalendar from "./BookingCalendar";
import EquipmentPicker from "./EquipmentPicker";
import BookingSummary from "./BookingSummary";
import { ConflictCard, ErrorCard, SuccessCard } from "./ResultCard";
import {
  STEPS,
  canOpen,
  isSubmittable,
  stepIndex,
  stepNumber,
  type BookingSelection,
} from "./steps";

interface BookingFormData {
  name: string;
  email: string;
  company: string;
  crewSize: string;
  brief: string;
  /** Honeypot — real people never fill this. */
  website: string;
}

type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "done"; ref: string; calendarBlocked: boolean }
  | { status: "conflict"; message: string; kind: "slot" | "equipment" }
  | { status: "error"; message: string };

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "rgba(0,0,0,0.5)",
  marginBottom: 4,
  display: "block",
};

const fieldStyle: React.CSSProperties = {
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
};

export default function BookingPageClient() {
  const isMobile = useIsMobile();

  const [activeStep, setActiveStep] = useState(0);
  const [spaceId, setSpaceId] = useState("");
  const [date, setDate] = useState<ISODate | null>(null);
  const [slotId, setSlotId] = useState("");
  const [addons, setAddons] = useState<Record<string, boolean>>(emptyAddonState);
  const [equipment, setEquipment] = useState<Record<string, number>>({});
  const [bundleIds, setBundleIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    company: "",
    crewSize: "",
    brief: "",
    website: "",
  });
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  /**
   * "Today" is resolved AFTER mount, never during render: /booking is
   * statically prerendered, so a clock read in the render path would bake the
   * build date into the shipped HTML and freeze it for every visitor.
   */
  const [today, setToday] = useState<ISODate | null>(null);
  useEffect(() => {
    setToday(todayInLisbon());
  }, []);

  const bounds: DateBounds | null = useMemo(() => {
    if (!today) return null;
    return {
      today,
      min: addDays(today, BOOKING_LEAD_TIME_DAYS),
      max: addDays(today, BOOKING_HORIZON_DAYS),
    };
  }, [today]);

  // The month the calendar is showing; starts on the first bookable month.
  const [month, setMonth] = useState<string | null>(null);
  useEffect(() => {
    if (!bounds || month) return;
    const p = parseISO(bounds.min);
    if (p) setMonth(monthKey(p.y, p.m1));
  }, [bounds, month]);

  const availability = useAvailability(spaceId || null, month);
  const monthData = availabilityData(availability);

  const selection: BookingSelection = {
    spaceId,
    date,
    slotId,
    name: formData.name,
    email: formData.email,
  };

  const quote = useMemo(
    () =>
      computeQuote({
        slotId,
        spaceId,
        addonIds: selectedAddonIds(addons),
        equipment,
        bundleIds,
      }),
    [slotId, spaceId, addons, equipment, bundleIds]
  );

  /* ── Setters that invalidate downstream choices ────────────────────────── */

  const chooseSpace = (id: string) => {
    setSpaceId(id);
    // A slot free in one room may be taken in the other.
    setSlotId("");
    setActiveStep(stepIndex("date"));
  };

  const chooseDate = (d: ISODate) => {
    setDate(d);
    setSlotId("");
    setActiveStep(stepIndex("slot"));
  };

  const chooseSlot = (id: string) => {
    setSlotId(id);
    setActiveStep(stepIndex("addons"));
  };

  const toggleAddon = (id: string) =>
    setAddons((prev) => ({ ...prev, [id]: !prev[id] }));

  const goTo = (i: number) => {
    if (canOpen(i, selection)) setActiveStep(i);
  };

  /* ── Submit ────────────────────────────────────────────────────────────── */

  const canConfirm = isSubmittable(selection) && !!date;

  const handleSubmit = async () => {
    if (!canConfirm || !date) return;

    // Kept across retries so a resubmission is recognised as the same booking.
    const key = idempotencyKey ?? crypto.randomUUID();
    if (!idempotencyKey) setIdempotencyKey(key);

    setSubmit({ status: "sending" });
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
          website: formData.website,
          date,
          slot: slotId,
          space: spaceId,
          addons,
          equipment,
          bundleIds,
          total: quote.total,
          idempotencyKey: key,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ref?: string;
        error?: string;
        message?: string;
        calendarBlocked?: boolean;
      };

      if (res.ok && data.ref) {
        setSubmit({
          status: "done",
          ref: data.ref,
          calendarBlocked: data.calendarBlocked !== false,
        });
        return;
      }
      if (res.status === 409) {
        setSubmit({
          status: "conflict",
          message: data.message ?? "Someone confirmed that slot a moment ago.",
          kind: data.error === "EQUIPMENT_TAKEN" ? "equipment" : "slot",
        });
        return;
      }
      // Never render success on a failure — that was the old bug.
      setSubmit({
        status: "error",
        message: data.error ?? `The studio didn't accept the booking (${res.status}).`,
      });
    } catch {
      setSubmit({
        status: "error",
        message: "We couldn't reach the studio. Check your connection and try again.",
      });
    }
  };

  const resolveConflict = (kind: "slot" | "equipment") => {
    if (kind === "equipment") {
      setSubmit({ status: "idle" });
      setActiveStep(stepIndex("equipment"));
      return;
    }
    setSlotId("");
    setSubmit({ status: "idle" });
    setActiveStep(stepIndex("slot"));
  };

  /* ── Per-step recap for collapsed headers ──────────────────────────────── */

  const spaceObj = BOOKABLE_SPACES.find((s) => s.id === spaceId);
  const slotObj = TIME_SLOTS.find((t) => t.id === slotId);
  const addonCount = selectedAddonIds(addons).length;
  const gearCount =
    Object.values(equipment).reduce((n, q) => n + q, 0) + bundleIds.length;

  const summaries: Record<string, string | undefined> = {
    space: spaceObj?.label,
    date: date ? formatDateHuman(date) : undefined,
    slot: slotObj?.label,
    addons: addonCount ? `${addonCount} SELECTED` : "NONE",
    equipment: gearCount ? `${gearCount} ITEM${gearCount > 1 ? "S" : ""}` : "NONE",
    details: formData.name || undefined,
  };

  const stepStateFor = (i: number): "done" | "active" | "locked" => {
    if (i === activeStep) return "active";
    return STEPS[i].isComplete(selection) && canOpen(i, selection) ? "done" : "locked";
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
            PICK A SPACE.{" "}
            <HandwrittenWord text="we'll handle" color={kiddoColors.lime} fontSize={80} />{" "}
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
          {/* Stepper bar — now gated: you cannot open a step whose
              prerequisites are unmet. */}
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
            {STEPS.map((step, i) => {
              const open = canOpen(i, selection);
              const isCurrent = activeStep === i;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goTo(i)}
                  disabled={!open}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: open ? "pointer" : "not-allowed",
                    borderRight:
                      i < STEPS.length - 1 ? "1px solid rgba(0,0,0,0.1)" : "none",
                    flexShrink: 0,
                    opacity: open ? 1 : 0.45,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      border: `1.5px solid ${isCurrent ? kiddoColors.black : "rgba(0,0,0,0.25)"}`,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-mono)",
                      fontSize: 8,
                      letterSpacing: "0.05em",
                      color: isCurrent ? kiddoColors.black : "rgba(0,0,0,0.35)",
                      background: isCurrent ? kiddoColors.lime : "transparent",
                      transition: "all 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    {stepNumber(i)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: isCurrent ? kiddoColors.black : "rgba(0,0,0,0.35)",
                      transition: "color 0.15s",
                    }}
                  >
                    {step.navLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr",
              gap: 32,
              alignItems: "start",
            }}
          >
            {/* LEFT: steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* 01 — SPACE */}
              <StepCard
                number={stepNumber(0)}
                label={STEPS[0].cardLabel}
                state={stepStateFor(0)}
                summary={summaries.space}
                onOpen={() => goTo(0)}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",
                    gap: 10,
                  }}
                >
                  {BOOKABLE_SPACES.map((sp) => {
                    const isSelected = spaceId === sp.id;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => chooseSpace(sp.id)}
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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sp.img}
                            alt={sp.label}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              filter: isSelected ? "none" : "grayscale(100%) opacity(0.7)",
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
                            background: isSelected ? kiddoColors.lime : "#fff",
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
                            {eurSigned(sp.upcharge)}
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

              {/* 02 — DATE */}
              <StepCard
                number={stepNumber(1)}
                label={STEPS[1].cardLabel}
                state={stepStateFor(1)}
                summary={summaries.date}
                onOpen={() => goTo(1)}
              >
                <BookingCalendar
                  value={date}
                  onSelect={chooseDate}
                  bounds={bounds}
                  availability={monthData}
                  loading={availability.status === "loading"}
                  month={month}
                  onMonthChange={setMonth}
                />
                <StepNav onBack={() => goTo(0)} />
              </StepCard>

              {/* 03 — SLOT */}
              <StepCard
                number={stepNumber(2)}
                label={STEPS[2].cardLabel}
                state={stepStateFor(2)}
                summary={summaries.slot}
                onOpen={() => goTo(2)}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr",
                    gap: 10,
                  }}
                >
                  {TIME_SLOTS.map((ts) => {
                    const isSelected = slotId === ts.id;
                    const st = date ? slotState(date, ts.id, monthData) : "unknown";
                    const busy = st === "busy";
                    return (
                      <button
                        key={ts.id}
                        type="button"
                        disabled={busy}
                        onClick={() => !busy && chooseSlot(ts.id)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          padding: "16px 16px",
                          border: isSelected
                            ? `1.5px solid ${kiddoColors.black}`
                            : "1.5px solid rgba(0,0,0,0.15)",
                          background: isSelected ? kiddoColors.lime : "#fff",
                          cursor: busy ? "not-allowed" : "pointer",
                          textAlign: "left",
                          opacity: busy ? 0.45 : 1,
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
                          {slotTimeLabel(ts)}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: 11,
                            color: "rgba(0,0,0,0.45)",
                            marginTop: 6,
                          }}
                        >
                          {busy ? "Already booked" : ts.note}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <StepNav onBack={() => goTo(1)} />
              </StepCard>

              {/* 04 — ADD-ONS */}
              <StepCard
                number={stepNumber(3)}
                label={STEPS[3].cardLabel}
                state={stepStateFor(3)}
                summary={summaries.addons}
                onOpen={() => goTo(3)}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {ADDON_OPTIONS.map((addon) => {
                    const checked = !!addons[addon.id];
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
                          background: checked ? "rgba(200,232,32,0.12)" : "#fff",
                          cursor: "pointer",
                          transition: "all 0.12s",
                        }}
                      >
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
                          onChange={() => toggleAddon(addon.id)}
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
                            {eurSigned(rateAmount(addon.rate) ?? 0)}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <StepNav onBack={() => goTo(2)} onContinue={() => goTo(4)} />
              </StepCard>

              {/* 05 — EQUIPMENT */}
              <StepCard
                number={stepNumber(4)}
                label={STEPS[4].cardLabel}
                state={stepStateFor(4)}
                summary={summaries.equipment}
                onOpen={() => goTo(4)}
              >
                <EquipmentPicker
                  value={equipment}
                  onChange={setEquipment}
                  bundleIds={bundleIds}
                  onBundlesChange={setBundleIds}
                  remaining={(code, inStock) =>
                    equipmentRemaining(date, code, monthData, inStock)
                  }
                  isMobile={isMobile}
                />
                <StepNav onBack={() => goTo(3)} onContinue={() => goTo(5)} />
              </StepCard>

              {/* 06 — DETAILS */}
              <StepCard
                number={stepNumber(5)}
                label={STEPS[5].cardLabel}
                state={stepStateFor(5)}
                summary={summaries.details}
                onOpen={() => goTo(5)}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Your name"
                      style={fieldStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@studio.com"
                      style={fieldStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Company / Production House</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))}
                      placeholder="Optional"
                      style={fieldStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Crew Size</label>
                    <select
                      value={formData.crewSize}
                      onChange={(e) => setFormData((p) => ({ ...p, crewSize: e.target.value }))}
                      style={{
                        ...fieldStyle,
                        color: formData.crewSize ? kiddoColors.black : "rgba(0,0,0,0.4)",
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

                  <div>
                    <label style={labelStyle}>Brief / Notes</label>
                    <textarea
                      value={formData.brief}
                      onChange={(e) => setFormData((p) => ({ ...p, brief: e.target.value }))}
                      placeholder="Tell us about the shoot — format, mood, references..."
                      rows={4}
                      style={{ ...fieldStyle, resize: "vertical" }}
                    />
                  </div>

                  {/* Honeypot: hidden from people, irresistible to naive bots. */}
                  <div aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
                    <label htmlFor="website">Website</label>
                    <input
                      id="website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={formData.website}
                      onChange={(e) => setFormData((p) => ({ ...p, website: e.target.value }))}
                    />
                  </div>
                </div>
                <StepNav onBack={() => goTo(4)} />
              </StepCard>
            </div>

            {/* RIGHT: sticky sidebar */}
            <div style={{ position: "sticky", top: isMobile ? 0 : 88 }}>
              {submit.status === "done" ? (
                <SuccessCard bookingRef={submit.ref} calendarBlocked={submit.calendarBlocked} />
              ) : submit.status === "conflict" ? (
                <ConflictCard
                  message={submit.message}
                  actionLabel={submit.kind === "equipment" ? "ADJUST GEAR →" : "PICK ANOTHER SLOT →"}
                  onAction={() => resolveConflict(submit.kind)}
                />
              ) : submit.status === "error" ? (
                <ErrorCard
                  message={submit.message}
                  onRetry={() => setSubmit({ status: "idle" })}
                />
              ) : (
                <BookingSummary
                  date={date}
                  slotId={slotId}
                  spaceId={spaceId}
                  crewSize={formData.crewSize}
                  quote={quote}
                  canConfirm={canConfirm}
                  isSubmitting={submit.status === "sending"}
                  onSubmit={handleSubmit}
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
