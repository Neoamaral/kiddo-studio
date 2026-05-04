"use client";
import { kiddoColors } from "./kiddoColors";
import type { BaseIconProps } from "./kiddoStyles";

export function CalendarSketchIcon({
  width = 64,
  height = 64,
  color = kiddoColors.black,
  strokeWidth = 2.5,
  className = "",
}: BaseIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer body — slightly wobbly rectangle */}
      <path
        d="M 8 14 C 12 12 24 12 36 12 C 48 12 56 12 58 14 C 60 16 60 28 60 40
           C 60 52 60 56 58 58 C 56 60 44 60 32 60 C 20 60 10 60 8 58
           C 6 56 6 48 6 36 C 6 24 6 16 8 14 Z"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinejoin="round"
      />
      {/* Header fill */}
      <path
        d="M 8 14 C 12 12 24 12 36 12 C 48 12 56 12 58 14 L 59 16 L 58 28 L 6 28 L 7 16 Z"
        fill={color}
      />
      {/* Left pin */}
      <path
        d="M 20 8 C 20 6 21 4 22 4 C 23 4 24 6 24 8 L 24 18 C 24 20 23 21 22 21
           C 21 21 20 20 20 18 Z"
        fill={color}
      />
      {/* Right pin */}
      <path
        d="M 40 8 C 40 6 41 4 42 4 C 43 4 44 6 44 8 L 44 18 C 44 20 43 21 42 21
           C 41 21 40 20 40 18 Z"
        fill={color}
      />
      {/* Grid dots */}
      <circle cx="18" cy="39" r="2.5" fill={color} />
      <circle cx="32" cy="39" r="2.5" fill={color} />
      <circle cx="46" cy="39" r="2.5" fill={color} />
      <circle cx="18" cy="51" r="2.5" fill={color} />
      {/* Lime highlighted day */}
      <circle cx="32" cy="51" r="4" fill={kiddoColors.lime} stroke={color} strokeWidth={1.5} />
      <circle cx="46" cy="51" r="2.5" fill={color} />
    </svg>
  );
}
