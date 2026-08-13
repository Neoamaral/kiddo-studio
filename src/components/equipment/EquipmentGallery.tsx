"use client";

/**
 * Photo gallery for the equipment detail modal. No carousel library — the
 * project has none and the interaction is small enough to own.
 *
 * Three distinct shapes: 0 photos (placeholder), 1 photo (stage only, no
 * controls to clutter the focus trap), N photos (everything on).
 */

import { useEffect, useRef, useState } from "react";
import { CameraSketchIcon, VerticalDots, kiddoColors } from "@/components/kiddo-assets";
import type { EquipmentPhoto } from "@/data/types";
import { monoXsStyle } from "./ledgerBits";

/** Swipe must travel this far, or be this fast, to change photo. */
const SWIPE_PX = 45;
const SWIPE_VELOCITY = 0.4;

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
};

function ArrowButton({
  dir,
  onClick,
  size,
}: {
  dir: "prev" | "next";
  onClick: () => void;
  size: number;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={dir === "prev" ? "Previous photo" : "Next photo"}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1px solid ${kiddoColors.black}`,
        background: hover ? kiddoColors.lime : "rgba(255,255,255,0.9)",
        color: kiddoColors.black,
        fontSize: 18,
        fontFamily: "var(--font-mono)",
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "background 0.15s",
        flexShrink: 0,
      }}
    >
      {dir === "prev" ? "‹" : "›"}
    </button>
  );
}

function EmptyStage({ ratio }: { ratio: string }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: ratio,
        background: "#F0EBDE",
        border: "1px solid rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      <CameraSketchIcon width={132} height={110} showAccent={false} />
      <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.4)" }}>
        NO PHOTO ON FILE
      </span>
    </div>
  );
}

export default function EquipmentGallery({
  photos,
  itemName,
  isMobile,
  isDesktop,
}: {
  photos: readonly EquipmentPhoto[];
  itemName: string;
  isMobile: boolean;
  isDesktop: boolean;
}) {
  const n = photos.length;
  const [index, setIndex] = useState(0);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const gesture = useRef<{ x: number; y: number; t: number } | null>(null);
  const axis = useRef<"none" | "x" | "y">("none");

  // Wraps in both directions.
  const go = (next: number) => setIndex(((next % n) + n) % n);

  /* Preload the neighbours so arrow/swipe feels instant. */
  useEffect(() => {
    if (n < 2) return;
    for (const j of [index + 1, index - 1]) {
      const p = photos[((j % n) + n) % n];
      if (p) {
        const img = new window.Image();
        img.src = p.src;
      }
    }
  }, [index, photos, n]);

  /* Keep the active thumbnail in view. */
  useEffect(() => {
    thumbRefs.current[index]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [index]);

  const ratio = isMobile ? "1 / 1" : "4 / 3";

  if (n === 0) return <EmptyStage ratio={ratio} />;

  const photo = photos[index];
  const arrowSize = isMobile ? 38 : 40;

  const stage = (
    <div
      // Only interactive when there is somewhere to go.
      {...(n > 1
        ? {
            tabIndex: 0,
            role: "group" as const,
            "aria-roledescription": "carousel",
            "aria-label": `${itemName} photos`,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                go(index - 1);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                go(index + 1);
              }
            },
            onPointerDown: (e: React.PointerEvent) => {
              // Mouse drag must not change the photo — only touch/pen.
              if (e.pointerType === "mouse") return;
              gesture.current = { x: e.clientX, y: e.clientY, t: Date.now() };
              axis.current = "none";
            },
            onPointerMove: (e: React.PointerEvent) => {
              const g = gesture.current;
              if (!g) return;
              const dx = e.clientX - g.x;
              const dy = e.clientY - g.y;
              if (axis.current === "none" && Math.hypot(dx, dy) > 10) {
                axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
              }
            },
            onPointerUp: (e: React.PointerEvent) => {
              const g = gesture.current;
              gesture.current = null;
              if (!g || axis.current !== "x") return;
              const dx = e.clientX - g.x;
              const dt = Date.now() - g.t;
              if (Math.abs(dx) > SWIPE_PX || Math.abs(dx) / dt > SWIPE_VELOCITY) {
                go(index + (dx < 0 ? 1 : -1));
              }
            },
            onPointerCancel: () => {
              gesture.current = null;
            },
          }
        : {})}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: ratio,
        background: kiddoColors.white,
        border: "1px solid rgba(0,0,0,0.12)",
        overflow: "hidden",
        // The browser keeps vertical scrolling; we only claim the horizontal axis.
        touchAction: n > 1 ? "pan-y" : undefined,
        outlineOffset: 2,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // key so React swaps the element instead of mutating src — otherwise the
        // previous photo lingers visibly while the new one decodes.
        key={photo.src}
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading="eager"
        decoding="async"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          // contain, not cover: letterboxing a lens is better than cropping it.
          objectFit: "contain",
          display: "block",
        }}
      />

      {/* Desktop arrows sit over the stage; on mobile they live below it, out
          from under the thumb, so they don't fight the swipe. */}
      {n > 1 && !isMobile && (
        <>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
            <ArrowButton dir="prev" size={arrowSize} onClick={() => go(index - 1)} />
          </div>
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            <ArrowButton dir="next" size={arrowSize} onClick={() => go(index + 1)} />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      {/* Swapping an <img> src is completely silent to assistive tech. */}
      {n > 1 && (
        <div aria-live="polite" aria-atomic="true" style={srOnly}>
          {`Photo ${index + 1} of ${n}: ${photo.alt}`}
        </div>
      )}

      <div style={{ display: "flex", gap: 14, alignItems: "stretch", minWidth: 0 }}>
        {/* VerticalDots is genuinely vertical — desktop gutter only, never rotated. */}
        {n > 1 && isDesktop && (
          <div
            aria-hidden="true"
            style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
          >
            <VerticalDots
              count={n}
              activeIndex={index}
              color="rgba(0,0,0,0.18)"
              activeColor={kiddoColors.black}
              size={7}
              gap={10}
            />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>{stage}</div>
      </div>

      {photo.caption && (
        <div style={{ ...monoXsStyle, color: "rgba(0,0,0,0.4)" }}>{photo.caption}</div>
      )}

      {n > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isMobile && (
            <ArrowButton dir="prev" size={arrowSize} onClick={() => go(index - 1)} />
          )}
          <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.45)" }}>
            {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </span>
          {isMobile && (
            <ArrowButton dir="next" size={arrowSize} onClick={() => go(index + 1)} />
          )}

          {/* Thumbnails: tablet and desktop only — on a phone the strip
              competes with the swipe gesture for the same pixels. */}
          {!isMobile && (
            <div
              className="eq-thumbs"
              style={{
                display: "flex",
                gap: 6,
                overflowX: "auto",
                scrollbarWidth: "none",
                marginLeft: "auto",
                minWidth: 0,
              }}
            >
              {photos.map((p, i) => (
                <button
                  key={p.src}
                  ref={(el) => {
                    thumbRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === index}
                  style={{
                    width: 56,
                    height: 56,
                    flexShrink: 0,
                    padding: 0,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: kiddoColors.white,
                    cursor: "pointer",
                    outline: i === index ? `2px solid ${kiddoColors.black}` : "none",
                    outlineOffset: 2,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
