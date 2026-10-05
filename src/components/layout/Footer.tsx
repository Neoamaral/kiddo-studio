"use client";
import Link from "next/link";
import { KiddoLogo } from "@/components/ui/KiddoLogo";
import { CircularBadgeSeal } from "@/components/kiddo-assets";
import { kiddoColors } from "@/components/kiddo-assets/kiddoColors";
import PreferencesLink from "@/components/analytics/PreferencesLink";
import type { ContactView } from "@/data/contact";

const footerCols = [
  {
    title: "STUDIO",
    links: [
      { label: "Studio Space",  href: "/studio"    },
      { label: "Equipment",     href: "/equipment" },
      { label: "Book a Day",    href: "/booking"   },
      { label: "Pricing",       href: "/pricing"   },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { label: "About Us",   href: "/about"   },
      { label: "Contact",    href: "/contact"  },
    ],
  },
  {
    title: "INFO",
    links: [
      { label: "__CITY__",         href: "/contact"  },
      { label: "FAQ",              href: "/about"    },
      // NOTE: "Terms" points at /about because no terms page exists. Left as
      // found — writing terms of service is not a code change.
      { label: "Terms",            href: "/about"    },
      { label: "Privacy",          href: "/privacy"  },
    ],
  },
];

export default function Footer({ contact }: { contact: ContactView }) {
  return (
    <footer className="section-dark">
      <div className="kiddo-container py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-10 items-start">
          {/* Brand col */}
          <div className="flex flex-col gap-3">
            <KiddoLogo color="white" size="md" />
            <p className="font-mono text-[10px] tracking-widest text-white/40 uppercase mt-2">
              {contact.cityCountry}
            </p>
            <p className="font-body text-[12px] text-white/40 max-w-[160px] leading-relaxed">
              A creative playground for filmmakers, photographers and dreamers.
            </p>
          </div>

          {/* Nav columns. The city row is the studio's, so it comes from the
              contact record rather than from this list. */}
          {footerCols.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="font-mono text-[9px] tracking-[0.25em] text-white/30 uppercase">
                {col.title}
              </span>
              {col.links.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className="font-body text-[13px] text-white/60 hover:text-white transition-colors"
                >
                  {link.label === "__CITY__" ? contact.cityCountry : link.label}
                </Link>
              ))}
            </div>
          ))}

          {/* FOLLOW. Separate from the nav columns because these leave the site
              — and because they are edited in the panel, not in this file. */}
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[9px] tracking-[0.25em] text-white/30 uppercase">
              FOLLOW
            </span>
            {contact.social.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-[13px] text-white/60 hover:text-white transition-colors"
              >
                {s.label.charAt(0) + s.label.slice(1).toLowerCase()}
              </a>
            ))}
          </div>

          {/* Badge */}
          <div className="hidden lg:flex items-center">
            <CircularBadgeSeal
              size={110}
              spinning
              color={kiddoColors.lime}
              bgColor="#111111"
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
        >
          <span className="font-mono text-[9px] tracking-widest text-white/30 uppercase">
            © {new Date().getFullYear()} Kiddo Studio. All rights reserved.
          </span>
          <span className="flex items-center gap-5">
            {/*
              Withdrawal has to be as easy as consent, so it lives in the one
              place that is on every public page rather than buried in the
              policy. White-on-dark here; the component defaults to the light
              palette it uses on the privacy page.
            */}
            <PreferencesLink
              label="Cookie settings"
              style={{
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.15em",
                textDecoration: "none",
              }}
            />
            <span className="font-mono text-[9px] tracking-widest text-white/30 uppercase">
              Made with weird energy.
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}
