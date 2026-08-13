"use client";

/**
 * Accessible modal shell — the first one in this project, so the fiddly parts
 * are documented rather than assumed.
 *
 * Owns: portal, Escape, backdrop dismissal, body scroll lock, focus trap,
 * focus restore and ARIA scaffolding. Knows nothing about its content.
 *
 * Renders NOTHING during SSR (the `mounted` guard), so the built static HTML of
 * every page is unaffected — that property is asserted in the build diff.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** id of the element that names the dialog; wired to aria-labelledby. */
  labelledBy: string;
  children: React.ReactNode;
  /** Panel max-width in px on desktop. Mobile is always full-bleed. */
  maxWidth?: number;
  /** Full-bleed sheet instead of a centred card (used on phones). */
  fullBleed?: boolean;
}

export default function Modal({
  open,
  onClose,
  labelledBy,
  children,
  maxWidth = 1100,
  fullBleed = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const pressedBackdrop = useRef(false);

  useEffect(() => setMounted(true), []);

  /* Escape — on document, in the capture phase, so nothing can swallow it. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  /*
   * Scroll lock. The scrollbar width MUST be measured at runtime: globals.css
   * sets a 5px custom WebKit scrollbar, so the compensation is 5px on
   * Chrome/Windows, ~15px on Firefox and 0 on macOS/iOS overlay scrollbars.
   * A hardcoded constant would visibly shift the page on two of the three.
   */
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (gap > 0) {
      const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + gap}px`;
    }
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [open]);

  /* Focus in on open, restore to the trigger on close. */
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    // Focus the PANEL, not the close button, so screen readers announce
    // "dialog, <title>" rather than just "Close, button".
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      const prev = prevFocus.current;
      // The trigger can be gone if the user changed the category filter.
      if (prev && document.contains(prev)) {
        prev.focus({ preventScroll: true });
      }
    };
  }, [open]);

  /* Enter animation, skipped when the user prefers reduced motion. */
  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true))
    );
    return () => cancelAnimationFrame(raf);
  }, [open]);

  /*
   * Tab cycling. Re-query on every press — never cache: the gallery adds and
   * removes arrow buttons as the photo index changes, so a cached list goes
   * stale. getClientRects() is the visibility test, not offsetParent, which is
   * null for position:fixed elements even when they are perfectly visible.
   */
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;

    const nodes = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE)
    ).filter((el) => el.getClientRects().length > 0);

    if (nodes.length === 0) {
      e.preventDefault();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!active || !panel.contains(active)) {
      e.preventDefault();
      first.focus();
      return;
    }
    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    }
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Both the press AND the release must be on the backdrop. Without the
        // paired check, selecting text inside the panel and releasing outside
        // it would close the modal.
        if (pressedBackdrop.current && e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100, // header is 50, the equipment toolbar is 40
        background: "rgba(26,26,26,0.72)",
        display: "flex",
        alignItems: fullBleed ? "stretch" : "center",
        justifyContent: "center",
        padding: fullBleed ? 0 : "clamp(1rem, 4vw, 3rem)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.14s ease-out",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={{
          position: "relative",
          outline: "none",
          width: "100%",
          maxWidth: fullBleed ? "none" : maxWidth,
          maxHeight: fullBleed ? "none" : "88vh",
          height: fullBleed ? "100%" : "auto",
          display: "flex",
          flexDirection: "column",
          background: "#F8F5EE",
          border: fullBleed ? "none" : "2px solid #1A1A1A",
          overflow: "hidden",
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "transform 0.14s ease-out",
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
