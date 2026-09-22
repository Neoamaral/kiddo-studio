import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "kiddo-lime":      "#C8E820",
        "kiddo-black":     "#1A1A1A",
        "kiddo-cream":     "#F2EFE6",
        "kiddo-dark":      "#111111",
        "kiddo-off-white": "#F8F5EE",
        "kiddo-mid-gray":  "#888888",
        "kiddo-dark-gray": "#2A2A2A",
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Black", "Impact", "sans-serif"],
        body:    ["var(--font-body)", "Arial", "sans-serif"],
        hand:    ["var(--font-hand)", "Georgia", "serif"],
        mono:    ["var(--font-mono)", "'Courier New'", "monospace"],
      },
      animation: {
        "spin-slow":   "spin 12s linear infinite",
        "spin-medium": "spin 8s linear infinite",
        "float-slow":  "float-slow 7s ease-in-out infinite",
      },
      keyframes: {
        /*
         * Floating in place — the hero smiley.
         *
         * Three UNEQUAL stops, not an even 0/50/100 sine: a regular up-down
         * beat reads as a loading indicator however slow it is, because the
         * eye locks onto the rhythm. Rising 9px, half-settling to 4px, then
         * drifting back gives nothing to lock onto.
         *
         * It only ever rises, so the designed position stays the resting
         * position. Starts and ends at the identity transform on purpose: the
         * prefers-reduced-motion rule in globals.css cuts the duration to
         * 0.01ms and the element lands on the 100% frame instantly, which must
         * therefore be exactly where the layout put it.
         *
         * translate3d rather than translateY to guarantee compositor
         * promotion — this element overlaps a photo, and without promotion it
         * would repaint that photo every frame.
         */
        "float-slow": {
          "0%":   { transform: "translate3d(0, 0, 0) rotate(0deg)" },
          "33%":  { transform: "translate3d(0, -9px, 0) rotate(1.2deg)" },
          "66%":  { transform: "translate3d(0, -4px, 0) rotate(-1deg)" },
          "100%": { transform: "translate3d(0, 0, 0) rotate(0deg)" },
        },
      },
      fontSize: {
        "display-hero": ["clamp(3.5rem,9vw,9rem)", { lineHeight: "0.92" }],
        "display-lg":   ["clamp(2rem,5vw,5rem)",   { lineHeight: "1" }],
        "display-md":   ["clamp(1.5rem,3vw,3rem)", { lineHeight: "1.1" }],
      },
    },
  },
  plugins: [],
};

export default config;
