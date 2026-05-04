export const kiddoColors = {
  lime: "#C8E820",
  limeDark: "#A8C010",
  limeLight: "#D8F030",
  black: "#1A1A1A",
  nearBlack: "#111111",
  cream: "#F2EFE6",
  offWhite: "#F8F5EE",
  white: "#FFFFFF",
  darkGray: "#2A2A2A",
  midGray: "#888888",
  lightGray: "#C8C8C8",
  tape: "#C8E820",
  tapeBlack: "#1A1A1A",
  tapePaper: "#D8CEBC",
} as const;

export type KiddoColor = keyof typeof kiddoColors;
