/**
 * What each package actually gets you, as photographs.
 *
 * The rate card lists four lines of text per ticket. These are those lines
 * with the room's own photos against them, which is the difference between
 * reading "heavy grip package" and seeing the castors.
 *
 * Full House is Base Hire plus one chapter. That is not a layout convenience,
 * it is what the card says — "Everything in Base Hire" — and the photographs
 * agree: 25 of the 32 shots for Full House are byte-for-byte the same files,
 * so this file reuses them rather than shipping a second copy of the same
 * garment rail.
 *
 * Nothing here is eyeballed:
 *   - the backdrop names are measured. Each paper was sampled against the
 *     concrete floor in its own frame, so the exposure cancels out: white
 *     reads 1.56x the concrete, black 0.23x, and the grey is a genuine
 *     blue-grey (red/blue 0.86), not an underexposed white.
 *   - each wash colour carries the hue measured off the wall in that frame,
 *     so a label cannot drift from the photo it sits under.
 *   - the model names are read off the bodies in the photographs, not off the
 *     rate card. Where the two disagree the photograph wins here and the
 *     disagreement is flagged rather than quietly reconciled: the card says
 *     "Amaran 200 Bi" and the light in frame is an amaran 200x S, which is a
 *     different model (daylight point source, not bi-colour).
 *   - no counts are claimed. The card does the counting.
 *
 * Photos live in public/images/base-hire/ and public/images/full-house/,
 * resized to the width each one is drawn at. Nothing downloads a 4000px
 * original to render it 500px wide.
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
  /*
   * No chapter number here on purpose. It is the position in the tour, and
   * Full House inserts a chapter in front of Base Hire's — written by hand,
   * the two tours would disagree the moment one of them changed.
   */
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
const F = "/images/full-house/";

/** The room itself. Base Hire IS this; Full House is this plus the key light. */
const ROOM: readonly TourChapter[] = [
  {
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
 * The chapter that Full House adds. The ticket's own selling point, so it
 * leads rather than sitting third behind two chapters the cheaper package
 * already includes.
 *
 * The body in every frame reads STORM 400x. The rate card says "Aputure Storm
 * 400"; same light, and the card is the one that sets the wording for the
 * ticket, so nothing is corrected here — only photographed.
 */
const KEY_LIGHT: TourChapter = {
  id: "key",
  nav: "KEY LIGHT",
  title: "THE KEY LIGHT",
  blurb:
    "An Aputure Storm 400x on a rolling stand, with its battery and controller on the column so it can be moved without unplugging anything. Six ways to shape it, swapped on the Bowens mount in a minute.",
  photos: [
    {
      src: F + "storm-reflector.jpg",
      caption: "REFLECTOR",
      alt: "The Aputure Storm 400x on a rolling stand with its standard silver reflector dish.",
      width: 1000,
      height: 1500,
    },
    {
      src: F + "storm-snoot.jpg",
      caption: "SNOOT",
      alt: "The Storm 400x fitted with a black conical snoot for a narrow beam.",
      width: 1000,
      height: 1500,
    },
    {
      src: F + "storm-lantern.jpg",
      caption: "LANTERN",
      alt: "The Storm 400x inside a white spherical lantern softbox, throwing light in every direction.",
      width: 1000,
      height: 1500,
    },
    {
      src: F + "storm-parabolic.jpg",
      caption: "PARABOLIC + GRID",
      alt: "The Storm 400x in a deep black parabolic softbox fitted with an egg-crate grid.",
      width: 1000,
      height: 1500,
    },
    {
      src: F + "storm-strip.jpg",
      caption: "STRIP 30×120 + GRID",
      alt: "The Storm 400x in a Zarion SB-30120F strip softbox with an egg-crate grid.",
      width: 1000,
      height: 1500,
    },
    {
      src: F + "storm-octa.jpg",
      caption: "OCTABOX",
      alt: "The Storm 400x in a silver-lined octagonal softbox.",
      width: 1000,
      height: 1500,
    },
  ],
  detailsNote:
    "And the second head, for fill and hair. The body reads amaran 200x S — the rate card calls it a 200 Bi.",
  details: [
    {
      src: F + "amaran-200x.jpg",
      caption: "AMARAN 200X S",
      alt: "An amaran 200x S point-source light on a rolling stand, with no modifier fitted.",
      width: 1000,
      height: 1500,
    },
  ],
};

/** Base Hire: the room, nothing added. */
export const BASE_HIRE_TOUR: readonly TourChapter[] = ROOM;

/** Full House: the key light first, then the same room. */
export const FULL_HOUSE_TOUR: readonly TourChapter[] = [KEY_LIGHT, ...ROOM];

/**
 * How many photographs a tour holds. Counted, never typed: the button on each
 * rate card prints this number, and a number written in two places is a number
 * that goes wrong in one of them.
 */
export function photoCount(tour: readonly TourChapter[]): number {
  return tour.reduce(
    (n, c) => n + c.photos.length + (c.strip?.length ?? 0) + (c.details?.length ?? 0),
    0
  );
}
