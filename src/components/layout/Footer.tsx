"use client";
import Link from "next/link";
import { KiddoLogo } from "@/components/ui/KiddoLogo";
import { CircularBadgeSeal } from "@/components/kiddo-assets";
import { kiddoColors } from "@/components/kiddo-assets/kiddoColors";

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
      { label: "Projects",   href: "/projects" },
      { label: "Contact",    href: "/contact"  },
    ],
  },
  {
    title: "INFO",
    links: [
      { label: "Lisbon, Portugal", href: "/contact"  },
      { label: "FAQ",              href: "/about"    },
      { label: "Terms",            href: "/about"    },
    ],
  },
  {
    title: "FOLLOW",
    links: [
      { label: "Instagram", href: "https://instagram.com" },
      { label: "Behance",   href: "https://behance.net"   },
      { label: "LinkedIn",  href: "https://linkedin.com"  },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="section-dark">
      <div className="kiddo-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-10 items-start">
          {/* Brand col */}
          <div className="flex flex-col gap-3">
            <KiddoLogo color="white" size="md" />
            <p className="font-mono text-[10px] tracking-widest text-white/40 uppercase mt-2">
              Lisbon, Portugal
            </p>
            <p className="font-body text-[12px] text-white/40 max-w-[160px] leading-relaxed">
              A creative playground for filmmakers, photographers and dreamers.
            </p>
          </div>

          {/* Nav columns */}
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
                  {link.label}
                </Link>
              ))}
            </div>
          ))}

          {/* Badge */}
          <div className="flex items-center">
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
          <span className="font-mono text-[9px] tracking-widest text-white/30 uppercase">
            Made with weird energy.
          </span>
        </div>
      </div>
    </footer>
  );
}
