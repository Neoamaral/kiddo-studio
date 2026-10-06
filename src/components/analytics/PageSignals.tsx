"use client";

/**
 * page_view, and every click worth counting — from ONE listener.
 *
 * There is no shared Button component in this project: each CTA is an inline
 * styled <a> or <button>, and there are more than twenty links to /booking
 * across the site. Instrumenting them one by one would mean editing twenty
 * files and editing a twenty-first every time someone adds a CTA.
 *
 * So the listener lives on `document` and classifies by href. When the
 * component layer has no single chokepoint, the DOM is one. The count stops
 * mattering, and a CTA added next year is measured without anybody
 * remembering to.
 *
 * Outbound links record the HOST and never the full URL. A query string on the
 * way out can carry anything.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/track";

function label(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
}

/** Nearest named region, so a CTA can be told apart from the same CTA elsewhere. */
function location(el: Element): string {
  const marked = el.closest("[data-analytics-section]");
  if (marked) return marked.getAttribute("data-analytics-section")!.slice(0, 40);
  const section = el.closest("section[id]");
  if (section) return section.id.slice(0, 40);
  return window.location.pathname.slice(0, 40);
}

export default function PageSignals() {
  const pathname = usePathname();

  /* One page_view per path. Soft navigation does not remount this component,
     so a mount-only effect would undercount every click-through. */
  useEffect(() => {
    track("page_view", {
      device: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
    });
  }, [pathname]);

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as Element | null;
      const el = target?.closest?.("a[href]");
      if (!el) return;
      const href = el.getAttribute("href") ?? "";

      if (href.startsWith("/booking")) {
        track("cta_click", { to: "/booking", label: label(el), location: location(el) });
        return;
      }
      if (href.startsWith("mailto:")) return track("outbound_click", { kind: "mailto" });
      if (href.startsWith("tel:")) return track("outbound_click", { kind: "tel" });
      if (!/^https?:/i.test(href)) return;

      try {
        const host = new URL(href).hostname.replace(/^www\./, "");
        const kind = /wa\.me|whatsapp/.test(host)
          ? "whatsapp"
          : /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|google\.com\/maps/.test(href)
            ? "maps"
            : /instagram|facebook|linkedin|youtube|vimeo|tiktok/.test(host)
              ? "social"
              : "other";
        // Host only, deliberately. Never the path, never the query.
        track("outbound_click", { kind, host });
      } catch {
        // An href the URL parser refuses is not worth a measurement.
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
