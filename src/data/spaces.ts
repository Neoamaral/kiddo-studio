/**
 * Studio spaces — shared by the booking flow and the studio page.
 *
 * HAND-AUTHORED. Not part of the Notion equipment sync.
 *
 * The studio page's "FROM 280€/DAY" / "FROM 320€/DAY" and the booking flow's
 * "+0€" / "+40€" / "+80€" describe the SAME thing from two angles: full-day base
 * plus the space upcharge. Both now derive from `upcharge`, so they can no
 * longer contradict each other.
 */

import type { Rate, StudioSpace } from "./types";
import { TIER_BY_ID } from "./pricing";
import { rateAmount } from "@/lib/money";

export const SPACES: readonly StudioSpace[] = [
  {
    id: "cyc",
    label: "CYCLORAMA",
    desc: "Seamless white wall, drive-in ready.",
    img: "/images/space-cyclorama.jpg",
    upcharge: 0,
    bookable: true,
  },
  {
    id: "blk",
    label: "BLACK BOX",
    desc: "Black-out, smoke-ready, UV rig.",
    img: "/images/space-black-box.jpg",
    upcharge: 40,
    bookable: true,
  },
  {
    id: "both",
    label: "BOTH",
    desc: "Use the full studio. All day.",
    img: "/images/space-creative.jpg",
    upcharge: 80,
    bookable: true,
  },
];

export const BOOKABLE_SPACES = SPACES.filter((s) => s.bookable);

export function spaceById(id: string | null): StudioSpace | undefined {
  return id ? SPACES.find((s) => s.id === id) : undefined;
}

export function spaceUpcharge(id: string | null): number {
  return spaceById(id)?.upcharge ?? 0;
}

/** "FROM 280€/DAY" / "FROM 320€/DAY" — full-day base plus this space's upcharge. */
export function spaceFromRate(space: StudioSpace): Rate {
  const fullDay = rateAmount(TIER_BY_ID.fd.rate) ?? 0;
  return { kind: "from", amount: fullDay + space.upcharge, per: "day" };
}
