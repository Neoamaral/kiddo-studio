/**
 * Studio spaces — shared by the booking flow and the studio page.
 *
 * HAND-AUTHORED. Not part of the Notion equipment sync.
 *
 * The studio page's "FROM 180€/DAY" / "FROM 220€/DAY" and the booking flow's
 * "+0€" / "+40€" / "+80€" describe the SAME thing from two angles: the cheapest
 * full day plus the space upcharge. Both derive from `upcharge`, so they can no
 * longer contradict each other. Excludes VAT, like every studio rate.
 */

import type { Rate, StudioSpace } from "./types";
import { cheapestFullDay } from "./pricing";
import type { StudioPackage } from "./types";

export const SPACES: readonly StudioSpace[] = [
  {
    id: "cyc",
    label: "CYCLORAMA",
    desc: "Seamless white wall, drive-in ready.",
    img: "/images/space-cyclorama.jpg",
    upcharge: 0,
    bookable: true,
    resourceIds: ["room-cyc"],
  },
  {
    id: "blk",
    label: "BLACK BOX",
    desc: "Black-out, smoke-ready, UV rig.",
    img: "/images/space-black-box.jpg",
    upcharge: 40,
    bookable: true,
    resourceIds: ["room-blk"],
  },
  {
    id: "both",
    label: "BOTH",
    desc: "Use the full studio. All day.",
    img: "/images/space-creative.jpg",
    upcharge: 80,
    bookable: true,
    resourceIds: ["room-cyc", "room-blk"],
  },
];

export const BOOKABLE_SPACES = SPACES.filter((s) => s.bookable);

export function spaceById(id: string | null): StudioSpace | undefined {
  return id ? SPACES.find((s) => s.id === id) : undefined;
}

export function spaceUpcharge(id: string | null): number {
  return spaceById(id)?.upcharge ?? 0;
}

/** "FROM 180€/DAY" — the cheapest package's full day plus this space's upcharge. */
export function spaceFromRate(
  space: StudioSpace,
  packages: readonly StudioPackage[]
): Rate {
  return {
    kind: "from",
    amount: cheapestFullDay(packages) + space.upcharge,
    per: "day",
  };
}
