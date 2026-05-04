"use client";
import { kiddoColors } from "./kiddoColors";
import type { BaseIconProps } from "./kiddoStyles";

export function HandDrawnStarIcon({
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
      {/* Vertical axis — slightly wobbly */}
      <path
        d="M 32 4 C 31 14 33 22 32 32 C 31 42 33 50 32 60"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Horizontal axis — slightly wavy */}
      <path
        d="M 4 33 C 14 31 22 33 32 32 C 42 31 50 33 60 31"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Diagonal top-left to bottom-right */}
      <path
        d="M 12 12 C 18 18 24 24 32 32 C 40 40 46 46 52 52"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Diagonal top-right to bottom-left */}
      <path
        d="M 52 12 C 46 18 40 24 32 32 C 24 40 18 46 12 52"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Center dot accent */}
      <circle cx="32" cy="32" r="4" fill={kiddoColors.lime} stroke={color} strokeWidth={1.5} />
    </svg>
  );
}
