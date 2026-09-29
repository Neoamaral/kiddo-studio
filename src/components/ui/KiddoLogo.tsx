"use client";

/**
 * The studio wordmark.
 *
 * Was typeset from the display font as "KIDDO" over "STUDIO". It is now the
 * real supplied artwork, which reads "Kiddo · VISUAL PLAYGROUND".
 *
 * COLOUR: three files, one per brand colour, because a PNG cannot be recoloured
 * with `color`. Measured against both site backgrounds:
 *
 *   black  — cream and white backgrounds
 *   white  — the near-black footer and dark bands
 *   sand   — dark backgrounds ONLY. #D8C6AD on the cream #F2EFE6 is very nearly
 *            invisible, so it is not offered as a light-background option.
 *
 * SIZE: the "VISUAL PLAYGROUND" line is tiny relative to the wordmark — it only
 * becomes readable at about 60px of total height. `sm` therefore renders it as
 * texture rather than as words; that is a property of the supplied lockup, not
 * a rendering choice.
 */

import Image from "next/image";

export type KiddoLogoColor = "black" | "white" | "sand";

interface KiddoLogoProps {
  color?: KiddoLogoColor;
  size?: "sm" | "md" | "lg";
  /** Overrides the size preset when a specific height is needed. */
  height?: number;
  className?: string;
  /**
   * Set on the ONE logo that acts as the page's link home; every other
   * instance is decorative repetition of a name already in the text.
   */
  decorative?: boolean;
}

/** Intrinsic ratio of the trimmed artwork, 960 × 723. */
const RATIO = 960 / 723;

const HEIGHTS: Record<NonNullable<KiddoLogoProps["size"]>, number> = {
  sm: 44,
  md: 90,
  lg: 130,
};

const SRC: Record<KiddoLogoColor, string> = {
  black: "/images/logo/kiddo-black.png",
  white: "/images/logo/kiddo-white.png",
  sand: "/images/logo/kiddo-sand.png",
};

export function KiddoLogo({
  color = "black",
  size = "md",
  height,
  className = "",
  decorative = false,
}: KiddoLogoProps) {
  const h = height ?? HEIGHTS[size];
  const w = Math.round(h * RATIO);

  return (
    <Image
      src={SRC[color]}
      alt={decorative ? "" : "Kiddo — visual playground"}
      aria-hidden={decorative || undefined}
      width={w}
      height={h}
      // Width and height are both given, so the box is reserved before the
      // file loads and the header does not jump on first paint.
      //
      // The width is EXPLICIT, not `auto`. The footer lockup sits in a
      // `flex-col`, whose default `align-items: stretch` resolves an auto
      // cross-size to the column width — which stretched the wordmark by a
      // third. maxWidth + objectFit keep it honest if a container is ever
      // narrower than the logo instead of squashing it.
      style={{ height: h, width: w, maxWidth: "100%", objectFit: "contain" }}
      className={className}
      priority={size === "sm"}
    />
  );
}
