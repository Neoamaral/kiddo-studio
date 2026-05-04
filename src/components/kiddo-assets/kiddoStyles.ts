export const kiddoSizes = {
  xs: 16,
  sm: 24,
  md: 40,
  lg: 64,
  xl: 96,
  "2xl": 128,
} as const;

export const kiddoStroke = {
  hairline: 1,
  thin: 1.5,
  regular: 2.5,
  medium: 3.5,
  bold: 5,
  thick: 7,
} as const;

export const kiddoRotations = {
  none: 0,
  slightLeft: -3,
  left: -6,
  slightRight: 3,
  right: 6,
  tapeLeft: -12,
  tapeRight: 8,
} as const;

export const kiddoFonts = {
  display: "'Arial Black', 'Helvetica Neue', Impact, sans-serif",
  body: "'Arial', 'Helvetica Neue', sans-serif",
  handwritten: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', Courier, monospace",
} as const;

export type BaseIconProps = {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
};
