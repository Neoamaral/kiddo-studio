"use client";
import { kiddoColors } from "./kiddoColors";
import type { BaseIconProps } from "./kiddoStyles";

export function DoorSketchIcon({
  width = 56,
  height = 72,
  color = kiddoColors.black,
  strokeWidth = 2.5,
  className = "",
}: BaseIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 56 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer frame — slightly imperfect */}
      <path
        d="M 4 4 C 8 2 20 2 28 3 C 36 2 48 2 52 4 C 54 6 54 20 54 36 C 54 52 54 64 52 68
           C 50 70 38 70 28 70 C 18 70 8 70 4 68 C 2 66 2 52 2 36 C 2 20 2 6 4 4 Z"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinejoin="round"
      />
      {/* Inner door panel */}
      <path
        d="M 10 10 C 14 8 20 8 28 9 C 36 8 42 8 46 10 C 48 12 48 24 48 36
           C 48 50 48 60 46 64 C 44 66 36 66 28 66 C 20 66 14 66 10 64
           C 8 62 8 50 8 36 C 8 24 8 12 10 10 Z"
        stroke={color}
        strokeWidth={strokeWidth - 0.5}
        fill="none"
        strokeLinejoin="round"
      />
      {/* Handle */}
      <circle cx="40" cy="37" r="3.5" stroke={color} strokeWidth={strokeWidth - 0.5} fill="none" />
      <line x1="40" y1="40.5" x2="40" y2="46" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Hinge top */}
      <rect x="8" y="14" width="5" height="10" rx="1.5" fill={color} opacity="0.45" />
      {/* Hinge bottom */}
      <rect x="8" y="50" width="5" height="10" rx="1.5" fill={color} opacity="0.45" />
      {/* Light crack at bottom */}
      <path
        d="M 10 67 C 18 70 38 70 46 67"
        stroke={kiddoColors.lime}
        strokeWidth={2}
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}
