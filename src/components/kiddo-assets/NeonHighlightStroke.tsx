"use client";
import { kiddoColors } from "./kiddoColors";

interface NeonHighlightStrokeProps {
  variant?: "horizontal" | "square" | "vertical";
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
  className?: string;
}

export function NeonHighlightStroke({
  variant = "horizontal",
  width,
  height,
  color = kiddoColors.lime,
  opacity = 1,
  className = "",
}: NeonHighlightStrokeProps) {
  if (variant === "horizontal") {
    const w = width ?? 260;
    const h = height ?? 48;
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 260 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ opacity }}
        preserveAspectRatio="none"
      >
        <path
          d="M 8 32 C 16 12 32 8 52 10 C 80 12 100 8 128 10 C 156 12 180 8 208 10
             C 228 12 244 16 252 28 C 256 38 250 44 240 44 C 180 44 80 46 28 44
             C 12 43 4 40 8 32 Z"
          fill={color}
        />
      </svg>
    );
  }

  if (variant === "square") {
    const w = width ?? 120;
    const h = height ?? 120;
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ opacity }}
      >
        <path
          d="M 18 16 C 28 4 52 6 72 8 C 92 10 106 8 112 18 C 118 28 116 50 114 70
             C 112 90 114 104 104 112 C 94 120 70 118 48 116 C 26 114 10 112 8 100
             C 6 88 8 64 10 44 C 12 28 10 26 18 16 Z"
          fill={color}
        />
      </svg>
    );
  }

  // vertical
  const w = width ?? 52;
  const h = height ?? 200;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 52 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ opacity }}
      preserveAspectRatio="none"
    >
      <path
        d="M 12 8 C 22 4 36 6 44 12 C 50 18 48 38 46 60 C 44 80 48 100 46 120
           C 44 140 48 160 44 178 C 40 192 28 196 18 194 C 8 192 4 180 6 160
           C 8 140 6 120 6 100 C 6 80 4 60 6 40 C 8 24 6 10 12 8 Z"
        fill={color}
      />
    </svg>
  );
}
