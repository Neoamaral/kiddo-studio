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
