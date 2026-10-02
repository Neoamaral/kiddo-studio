/**
 * What a Base Hire actually gets you, as photographs.
 *
 * The rate card lists four lines of text. This is those four things with the
 * room's own photos against them, which is the difference between reading
 * "heavy grip package" and seeing the castors.
 *
 * Nothing here is eyeballed:
 *   - the backdrop names are measured. Each paper was sampled against the
 *     concrete floor in its own frame, so the exposure cancels out: white
 *     reads 1.56x the concrete, black 0.23x, and the grey is a genuine
 *     blue-grey (red/blue 0.86), not an underexposed white.
 *   - each wash colour carries the hue measured off the wall in that frame,
 *     so a label cannot drift from the photo it sits under.
 *   - no counts are claimed. The rate card says "3x Amaran Pano 120s"; this
 *     file describes what is in frame and leaves the counting to the card.
 *
 * The photos are in public/images/base-hire/, resized to the width each one is
 * drawn at. Nothing downloads a 4000px original to render it 500px wide.
 */

export interface TourPhoto {
  src: string;
  /** Shown under the photo in mono caps. A couple of words. */
  caption: string;
  alt: string;
  width: number;
  height: number;
  /** Measured off the photograph; drawn as a chip beside the caption. */
  swatch?: string;
}

export interface TourChapter {
  /** "01", "02"... rendered as the chapter number. */
  n: string;
  id: string;
  /** Short label for the jump nav. */
  nav: string;
  title: string;
  blurb: string;
  photos: readonly TourPhoto[];
  /** A row of small frames rather than the main grid. */
  strip?: readonly TourPhoto[];
  stripNote?: string;
  /** Close-ups. Smaller frames, because that is what they are. */
  details?: readonly TourPhoto[];
  detailsNote?: string;
}

const B = "/images/base-hire/";

export const BASE_HIRE_TOUR: readonly TourChapter[] = [
  {
    n: "01",
    id: "backdrops",
    nav: "BACKDROPS",
    title: "THE BACKDROPS",
    blurb:
      "Four seamless papers on the same rig, swapped between setups. The cyclorama is the fifth option, and that one is part of the room rather than the roll.",
    photos: [
      {
        src: B + "backdrop-white.jpg",
        caption: "WHITE",
        swatch: "#DDD7D7",
        alt: "White seamless paper rolled down to the studio floor.",
        width: 1400,
        height: 932,
      },
      {
        src: B + "backdrop-black.jpg",
        caption: "BLACK",
        swatch: "#211F20",
        alt: "Black seamless paper rolled down to the studio floor.",
        width: 1400,
        height: 933,
      },
      {
        src: B + "backdrop-green.jpg",
        caption: "CHROMA GREEN",
        swatch: "#099C36",
        alt: "Chroma green seamless paper rolled down to the studio floor.",
        width: 1400,
        height: 934,
      },
      {
        src: B + "backdrop-grey.jpg",
        caption: "COOL GREY",
        swatch: "#A9AFB5",
        alt: "Cool grey seamless paper rolled down to the studio floor.",
        width: 1400,
        height: 933,
      },
    ],
  },
  {
    n: "02",
    id: "light",
    nav: "THE LIGHT",
    title: "THE LIGHT",
    blurb:
      "Amaran Pano 120c panels on rolling stands, rigged to wash the background. Soft, full colour, driven from the back of the panel or from a phone.",
    photos: [
      {
        src: B + "pano-face.jpg",
        caption: "ON THE STAND",
        alt: "An Amaran Pano 120c panel mounted on a rolling stand, seen from the front.",
        width: 1000,
        height: 1500,
      },
      {
        src: B + "pano-back.jpg",
        caption: "THE BACK",
        alt: "The back of the Amaran Pano 120c, showing its control screen and app button.",
        width: 1000,
        height: 1500,
      },
      {
        src: B + "pano-diodes.jpg",
        caption: "THE FACE",
        alt: "The LED face of the Amaran Pano 120c panel in close view.",
        width: 1000,
        height: 1500,
      },
    ],
    stripNote: "Seven frames. One panel, one position. Only the colour changed.",
    strip: [
      {
        src: B + "wash-white.jpg",
        caption: "WHITE",
        swatch: "#949294",
        alt: "The panel washing the studio wall white.",
        width: 700,
        height: 1050,
      },
      {
        src: B + "wash-red.jpg",
        caption: "RED",
        swatch: "#A2040F",
        alt: "The panel washing the studio wall red.",
        width: 700,
        height: 1050,
      },
      {
        src: B + "wash-lime.jpg",
        caption: "LIME",
        swatch: "#73762D",
        alt: "The panel washing the studio wall yellow-green.",
        width: 700,
        height: 1050,
      },
      {
        src: B + "wash-green.jpg",
        caption: "GREEN",
        swatch: "#008738",
        alt: "The panel washing the studio wall green.",
        width: 700,
        height: 1050,
      },
      {
        src: B + "wash-cyan.jpg",
        caption: "CYAN",
        swatch: "#008B9D",
        alt: "The panel washing the studio wall cyan.",
        width: 700,
        height: 1050,
      },
      {
        src: B + "wash-blue.jpg",
        caption: "BLUE",
        swatch: "#1964FB",
        alt: "The panel washing the studio wall blue.",
        width: 700,
        height: 1050,
      },
      {
        src: B + "wash-violet.jpg",
        caption: "VIOLET",
        swatch: "#B127D0",
        alt: "The panel washing the studio wall violet.",
        width: 700,
        height: 1050,
      },
    ],
  },
  {
    n: "03",
    id: "grip",
    nav: "GRIP",
    title: "GRIP & STANDS",
    blurb:
      "C-stands for what has to stay exactly where you put it, rolling stands for what has to move, and light stands for the rest. Sandbags come with them.",
    photos: [
      {
        src: B + "c-stands.jpg",
        caption: "C-STANDS",
        alt: "Two chrome C-stands with grip heads, legs splayed on the studio floor.",
        width: 1000,
        height: 1500,
      },
      {
        src: B + "roller-stand.jpg",
        caption: "ROLLING STAND",
        alt: "A heavy rolling stand with red locking levers and braked castors.",
        width: 1000,
        height: 1500,
      },
      {
        src: B + "light-stands.jpg",
        caption: "LIGHT STANDS",
        alt: "A pair of compact chrome light stands.",
        width: 1000,
        height: 1099,
      },
    ],
    detailsNote: "The parts that do the holding.",
    details: [
      {
        src: B + "detail-grip-head.jpg",
        caption: "GRIP HEAD",
        alt: "Close view of a C-stand grip head clamped on its riser.",
        width: 800,
        height: 1200,
      },
      {
        src: B + "detail-knuckle.jpg",
        caption: "LEG KNUCKLE",
        alt: "Close view of the cast knuckle where the legs meet the column.",
        width: 800,
        height: 1200,
      },
      {
        src: B + "detail-rocker.jpg",
        caption: "LOCKING LEVERS",
        alt: "Close view of the red locking levers at the base of the rolling stand.",
        width: 800,
        height: 1200,
      },
      {
        src: B + "detail-castor.jpg",
        caption: "BRAKED CASTOR",
        alt: "Close view of a braked castor under the rolling stand's leg.",
        width: 800,
        height: 1200,
      },
    ],
  },
  {
    n: "04",
    id: "floor",
    nav: "ON THE FLOOR",
    title: "ON THE FLOOR",
    blurb:
      "The unglamorous half. Apple boxes to sit on, stand on and prop things with, a ladder that reaches the rig, a cart for everything else, and a rail for wardrobe.",
    photos: [
      {
        src: B + "apple-boxes.jpg",
        caption: "APPLE BOXES",
        alt: "Two birch apple boxes, one full and one half, on the studio floor.",
        width: 1000,
        height: 1103,
      },
      {
        src: B + "ladder.jpg",
        caption: "LADDER",
        alt: "An aluminium multi-purpose ladder opened in an A-frame.",
        width: 1000,
        height: 1500,
      },
      {
        src: B + "cart.jpg",
        caption: "UTILITY CART",
        alt: "A three-shelf black utility cart on castors, with a cup holder.",
        width: 1000,
        height: 1500,
      },
      {
        src: B + "garment-rail.jpg",
        caption: "GARMENT RAIL",
        alt: "A chrome garment rail on castors with a lower shelf.",
        width: 1000,
        height: 1501,
      },
    ],
  },
];

/**
 * How many photographs the tour holds. Counted from the data, never typed by
 * hand: the button on the rate card prints this number, and a number typed in
 * two places is a number that goes wrong in one of them.
 */
export const BASE_HIRE_PHOTO_COUNT = BASE_HIRE_TOUR.reduce(
  (n, c) => n + c.photos.length + (c.strip?.length ?? 0) + (c.details?.length ?? 0),
  0
);
