"use client";

/**
 * A package photo tour. One component, both tickets.
 *
 * Composes the generic <Modal> shell, so it owns no portal, focus or scroll
 * machinery — only layout and copy. Same arrangement as EquipmentDetailModal.
 *
 * The chapters and every caption come from packageTours.ts. This file decides
 * how many columns each one gets, and it decides that from the photographs
 * themselves rather than from a hand-set number: landscape plates get two
 * columns, portrait ones get three. A photo swapped for a different crop
 * re-flows on its own. Chapter numbers come from the position in the tour for
 * the same reason — Full House inserts a chapter in front of Base Hire's.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Modal from "@/components/ui/Modal";
import { ScribbleArrowIcon, kiddoColors } from "@/components/kiddo-assets";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { TourChapter, TourPhoto } from "./packageTours";

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

/** Height of the sticky header + jump nav, so a jump does not land under them. */
const STICKY = 96;

function Frame({
  photo,
  sizes,
  captionSize = 9,
}: {
  photo: TourPhoto;
  sizes: string;
  captionSize?: number;
}) {
  return (
    <figure style={{ margin: 0, minWidth: 0 }}>
      <div
        style={{
          position: "relative",
          border: "1px solid rgba(0,0,0,0.15)",
          background: "#EFEBE1",
          overflow: "hidden",
        }}
      >
        <Image
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes={sizes}
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>
      <figcaption
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginTop: 7,
          ...mono,
          fontSize: captionSize,
          letterSpacing: "0.18em",
          color: "rgba(0,0,0,0.5)",
        }}
      >
        {photo.swatch && (
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              flexShrink: 0,
              background: photo.swatch,
              border: "1px solid rgba(0,0,0,0.25)",
            }}
          />
        )}
        {photo.caption}
      </figcaption>
    </figure>
  );
}

function Chapter({
  chapter,
  n,
  isMobile,
  attach,
}: {
  chapter: TourChapter;
  /** "01", "02"… derived from the position, never stored on the chapter. */
  n: string;
  isMobile: boolean;
  attach: (el: HTMLElement | null) => void;
}) {
  // Two columns for landscape plates, three for portrait. Read off the first
  // photo rather than configured, so a re-crop re-flows without an edit here.
  const landscape = chapter.photos[0].width > chapter.photos[0].height;
  const cols = isMobile ? (landscape ? 1 : 2) : landscape ? 2 : 3;
  const gridSizes = isMobile
    ? landscape
      ? "92vw"
      : "46vw"
    : `${Math.round(1120 / cols)}px`;

  return (
    <section
      ref={attach}
      aria-labelledby={`tour-${chapter.id}`}
      style={{ scrollMarginTop: STICKY, paddingTop: 4 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          borderTop: `2px solid ${kiddoColors.black}`,
          paddingTop: 12,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: isMobile ? 30 : 42,
            lineHeight: 0.9,
            color: kiddoColors.lime,
            WebkitTextStroke: `1px ${kiddoColors.black}`,
            flexShrink: 0,
          }}
        >
          {n}
        </span>
        <h3
          id={`tour-${chapter.id}`}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: isMobile ? 22 : 28,
            lineHeight: 1,
            textTransform: "uppercase",
            margin: 0,
            color: kiddoColors.black,
          }}
        >
          {chapter.title}
        </h3>
      </div>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          lineHeight: 1.65,
          color: "rgba(0,0,0,0.62)",
          maxWidth: 620,
          margin: "0 0 16px",
        }}
      >
        {chapter.blurb}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: isMobile ? 12 : 16,
        }}
      >
        {chapter.photos.map((p) => (
          <Frame key={p.src} photo={p} sizes={gridSizes} />
        ))}
      </div>

      {chapter.strip && (
        <div style={{ marginTop: 20 }}>
          {chapter.stripNote && (
            <p
              style={{
                ...mono,
                fontSize: 9,
                color: "rgba(0,0,0,0.45)",
                margin: "0 0 10px",
                letterSpacing: "0.18em",
              }}
            >
              {chapter.stripNote}
            </p>
          )}
          {/*
            Seven across on a desktop. On a phone it scrolls sideways instead
            of stacking: the point of this row is that the frames sit next to
            each other, and a column of seven is not that.
          */}
          <div
            style={{
              display: "grid",
              gridAutoFlow: "column",
              gridAutoColumns: isMobile ? "33vw" : "minmax(0, 1fr)",
              gap: isMobile ? 8 : 10,
              overflowX: isMobile ? "auto" : "visible",
              overscrollBehaviorX: "contain",
              paddingBottom: isMobile ? 6 : 0,
            }}
          >
            {chapter.strip.map((p) => (
              <Frame
                key={p.src}
                photo={p}
                sizes={isMobile ? "33vw" : "160px"}
                captionSize={8}
              />
            ))}
          </div>
        </div>
      )}

      {chapter.details && (
        <div style={{ marginTop: 20 }}>
          {chapter.detailsNote && (
            <p
              style={{
                ...mono,
                fontSize: 9,
                color: "rgba(0,0,0,0.45)",
                margin: "0 0 10px",
                letterSpacing: "0.18em",
              }}
            >
              {chapter.detailsNote}
            </p>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, minmax(0, 1fr))`,
              gap: isMobile ? 10 : 14,
            }}
          >
            {chapter.details.map((p) => (
              <Frame
                key={p.src}
                photo={p}
                sizes={isMobile ? "44vw" : "260px"}
                captionSize={8}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

interface TourCopy {
  /** Small mono line above the title, e.g. "BASE HIRE · PACKAGE 1". */
  kicker: string;
  title: string;
  /** The line beside the closing CTA, e.g. "180€ FULL DAY · 110€ HALF · + IVA". */
  priceLine: string;
  ctaLabel: string;
}

function TourContent({
  titleId,
  onClose,
  chapters,
  copy,
}: {
  titleId: string;
  onClose: () => void;
  chapters: readonly TourChapter[];
  copy: TourCopy;
}) {
  const isMobile = useIsMobile(768);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sections = useRef<Record<string, HTMLElement | null>>({});
  const [active, setActive] = useState(chapters[0].id);

  const jump = useCallback((id: string) => {
    const el = sections.current[id];
    if (!el) return;
    // The jump nav is the only reason a chapter can land under the chrome,
    // and scrollMarginTop on the section is what answers for it.
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /*
   * Which chapter the nav underlines. The observer's root is the SCROLL PANE,
   * not the viewport — the page behind is scroll-locked, so a viewport-rooted
   * observer would never fire.
   */
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const els = Object.values(sections.current).filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        // The topmost chapter that is actually on screen wins, so scrolling
        // up and down lands on the same answer.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target instanceof HTMLElement) {
          const hit = Object.entries(sections.current).find(
            ([, el]) => el === visible[0].target
          );
          if (hit) setActive(hit[0]);
        }
      },
      { root, rootMargin: `-${STICKY}px 0px -55% 0px`, threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [chapters]);

  return (
    <>
      {/* Header. Sticky, so Close is reachable without scrolling back up. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px clamp(16px, 3vw, 28px)",
          borderBottom: `2px solid ${kiddoColors.black}`,
          background: "#F8F5EE",
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <span style={{ ...mono, color: "rgba(0,0,0,0.45)" }}>{copy.kicker}</span>
          <h2
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: isMobile ? 22 : 30,
              lineHeight: 1,
              textTransform: "uppercase",
              margin: "3px 0 0",
              color: kiddoColors.black,
            }}
          >
            {copy.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: `1px solid ${kiddoColors.black}`,
            background: "transparent",
            color: kiddoColors.black,
            fontSize: 18,
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Jump nav */}
      <nav
        aria-label="Chapters"
        style={{
          display: "flex",
          gap: 4,
          padding: "8px clamp(16px, 3vw, 28px)",
          borderBottom: "1px solid rgba(0,0,0,0.15)",
          background: "#F2EFE6",
          overflowX: "auto",
          overscrollBehaviorX: "contain",
          flexShrink: 0,
        }}
      >
        {chapters.map((c, i) => {
          const on = c.id === active;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => jump(c.id)}
              aria-current={on ? "true" : undefined}
              style={{
                ...mono,
                fontSize: 9,
                letterSpacing: "0.18em",
                whiteSpace: "nowrap",
                padding: "7px 11px",
                cursor: "pointer",
                border: "none",
                background: on ? kiddoColors.black : "transparent",
                color: on ? kiddoColors.lime : "rgba(0,0,0,0.55)",
              }}
            >
              {String(i + 1).padStart(2, "0")} {c.nav}
            </button>
          );
        })}
      </nav>

      <div
        ref={scrollRef}
        style={{
          overflowY: "auto",
          overscrollBehavior: "contain", // stops iOS chaining the scroll to the page
          minHeight: 0,
          padding: "clamp(16px, 3vw, 28px)",
          display: "flex",
          flexDirection: "column",
          gap: 34,
        }}
      >
        {chapters.map((c, i) => (
          <Chapter
            key={c.id}
            chapter={c}
            n={String(i + 1).padStart(2, "0")}
            isMobile={isMobile}
            attach={(el) => {
              sections.current[c.id] = el;
            }}
          />
        ))}

        <div
          style={{
            borderTop: `2px solid ${kiddoColors.black}`,
            paddingTop: 18,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <a
            href="/booking"
            style={{
              padding: "14px 22px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontWeight: 700,
              background: kiddoColors.lime,
              color: kiddoColors.black,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {copy.ctaLabel}
            <ScribbleArrowIcon variant="right" width={34} height={14} color={kiddoColors.black} />
          </a>
          <span style={{ ...mono, color: "rgba(0,0,0,0.45)", letterSpacing: "0.18em" }}>
            {copy.priceLine}
          </span>
        </div>
      </div>
    </>
  );
}

export default function PackageTourModal({
  open,
  onClose,
  chapters,
  copy,
}: {
  open: boolean;
  onClose: () => void;
  chapters: readonly TourChapter[];
  copy: TourCopy;
}) {
  const titleId = useId();
  // Full screen on a phone. A centred card inside a 390px viewport spends its
  // margins on the page behind it, which is the one thing nobody opened this
  // to look at. The shell already knows how; it just has to be told.
  const isMobile = useIsMobile(768);
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      maxWidth={1180}
      fullBleed={isMobile}
    >
      <TourContent titleId={titleId} onClose={onClose} chapters={chapters} copy={copy} />
    </Modal>
  );
}
