"use client";
import Link from "next/link";
import { useState } from "react";
import { KiddoLogo } from "@/components/ui/KiddoLogo";
import { NAV_LINKS, BOOKING_HREF } from "@/lib/site";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 bg-kiddo-cream kiddo-divider"
      style={{ borderBottom: "1px solid rgba(0,0,0,0.10)" }}
    >
      <div className="kiddo-container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <KiddoLogo size="sm" color="black" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-[11px] tracking-[0.2em] uppercase text-kiddo-black hover:text-kiddo-lime transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href={BOOKING_HREF}
            className="font-mono text-[11px] tracking-[0.15em] uppercase bg-kiddo-lime text-kiddo-black px-4 py-2 hover:bg-kiddo-black hover:text-kiddo-lime transition-colors"
          >
            BOOK THE STUDIO →
          </Link>
          <span className="w-2 h-2 rounded-full bg-kiddo-black inline-block" />
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-6 h-0.5 bg-kiddo-black transition-all ${mobileOpen ? "rotate-45 translate-y-2" : ""}`}
          />
          <span
            className={`block w-6 h-0.5 bg-kiddo-black transition-all ${mobileOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block w-6 h-0.5 bg-kiddo-black transition-all ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`}
          />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-kiddo-cream border-t border-black/10 px-6 py-6 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-[13px] tracking-[0.2em] uppercase text-kiddo-black"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={BOOKING_HREF}
            className="font-mono text-[11px] tracking-[0.15em] uppercase bg-kiddo-lime text-kiddo-black px-4 py-3 text-center mt-2"
            onClick={() => setMobileOpen(false)}
          >
            BOOK THE STUDIO →
          </Link>
        </div>
      )}
    </header>
  );
}
