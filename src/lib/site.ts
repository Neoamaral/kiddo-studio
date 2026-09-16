export const NAV_LINKS = [
  { label: "STUDIO",    href: "/studio" },
  { label: "EQUIPMENT", href: "/equipment" },
  { label: "PROJECTS",  href: "/projects" },
  { label: "PRICING",   href: "/pricing" },
  { label: "ABOUT",     href: "/about" },
  { label: "CONTACT",   href: "/contact" },
];

export const BOOKING_HREF = "/booking";

// PRICING_DATA moved to src/data/pricing.ts as HOME_PRICING_ROWS — it duplicated
// the pricing page's tiers in a third, incompatible shape.

/**
 * The home "THE SPACE" strip, rendered 3:4 portrait.
 *
 * These point at the -tall crops, not the landscape files the studio and
 * booking pages use: a centre crop of a 3:2 photo keeps only the middle half
 * of the frame, which threw away the pop-art wall in the creative area — the
 * one thing that room's own copy names.
 */
export const SPACE_ROOMS = [
  { label: "CYCLORAMA",       src: "/images/space-cyclorama-tall.jpg" },
  { label: "CREATIVE AREA",   src: "/images/space-creative-tall.jpg"  },
  { label: "MAKEUP & LOUNGE", src: "/images/space-makeup-tall.jpg"    },
  { label: "BLACK BOX",       src: "/images/space-black-box-tall.jpg" },
];

export const PROJECT_IMAGES = [
  "/images/project-01.jpg",
  "/images/project-02.jpg",
  "/images/project-03.jpg",
  "/images/project-04.jpg",
  "/images/project-05.jpg",
  "/images/project-06.jpg",
];

export const STUDIO_COORDINATES = "38.7223° N  9.1393° W";
