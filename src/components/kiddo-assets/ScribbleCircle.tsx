"use client";
import { kiddoColors } from "./kiddoColors";
import type { BaseIconProps } from "./kiddoStyles";

export function ScribbleCircle({
  width = 80,
  height = 80,
  color = kiddoColors.black,
  strokeWidth = 1.5,
  className = "",
}: BaseIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Loose, almost-closed hand-drawn circle */}
      <path
        d="M 40 8 C 54 6 68 12 74 24 C 80 36 78 54 70 64 C 62 74 48 78 36 76
           C 22 74 10 64 6 50 C 2 36 6 20 16 12 C 22 7 30 8 36 8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
