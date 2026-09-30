/**
 * The studio's location map.
 *
 * It used to be the map redrawn as SVG — 400 lines of literal coordinates for
 * streets, parks, trees and four badge icons, kept in step with the studio's
 * own illustration by hand. This is that illustration, so there is nothing to
 * keep in step any more.
 *
 * STUDIO_MAP_POINTS stays, because it is not the drawing: both callers render
 * it as a numbered list beside the map, and the numbers are the ones printed
 * on the badges. The fields that only existed to place things in the SVG —
 * the icon name, x, y and the route path — are gone with it.
 */

import Image from "next/image";

export interface MapPoint {
  /** The number printed on the badge in the artwork. */
  n: number;
  label: string;
}

export const STUDIO_MAP_POINTS: readonly MapPoint[] = [
  { n: 1, label: "PARKING" },
  { n: 2, label: "HARDWARE STORE" },
  { n: 3, label: "CAFE" },
  { n: 4, label: "ALDI" },
];

export interface StudioMapProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Fills its container, which both callers give a 16/9 box and a dark ground.
 *
 * `contain`, not `cover`: the artwork is 1.773:1 against a 16/9 box, so cover
 * would shave a pixel off the torn edge top and bottom. Contain leaves about
 * a pixel of the section's own background instead, and the map fades out to
 * transparency at its edges anyway, so there is nothing there to see.
 */
export function StudioMap({ className = "", style }: StudioMapProps) {
  return (
    <Image
      src="/images/studio-map.png"
      alt={
        "Illustrated map of the studio's neighbourhood. Kiddo Studio is marked " +
        "with a pin in the centre, with dashed walking routes to four numbered " +
        "landmarks: parking, a hardware store, a cafe and an Aldi supermarket. " +
        "A lime avenue runs diagonally across the map."
      }
      fill
      sizes="100vw"
      className={className}
      style={{ objectFit: "contain", ...style }}
    />
  );
}
