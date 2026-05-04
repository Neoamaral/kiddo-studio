"use client";
import { kiddoColors } from "./kiddoColors";
import type { BaseIconProps } from "./kiddoStyles";

interface StudioLightSketchIconProps extends BaseIconProps {
  showAccent?: boolean;
}

export function StudioLightSketchIcon({
  width = 100,
  height = 140,
  color = kiddoColors.black,
  strokeWidth = 2.5,
  showAccent = true,
  className = "",
}: StudioLightSketchIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Neon accent glow behind lens */}
      {showAccent && (
        <ellipse cx="50" cy="42" rx="28" ry="22" fill={kiddoColors.lime} />
      )}
      {/* Barn door left */}
      <path
        d="M 14 30 C 12 36 12 48 14 54 L 22 54 L 22 30 Z"
        fill="white"
        stroke={color}
        strokeWidth={strokeWidth - 0.5}
        strokeLinejoin="round"
      />
      {/* Barn door right */}
      <path
        d="M 86 30 C 88 36 88 48 86 54 L 78 54 L 78 30 Z"
        fill="white"
        stroke={color}
        strokeWidth={strokeWidth - 0.5}
        strokeLinejoin="round"
      />
      {/* Light head trapezoid */}
      <path
        d="M 20 56 C 24 58 36 60 50 60 C 64 60 76 58 80 56 L 74 22 L 26 22 Z"
        fill="white"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Lens front plate */}
      <path
        d="M 26 16 C 32 14 40 14 50 14 C 60 14 68 14 74 16 L 76 22 L 24 22 Z"
        fill="white"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Lens glass fill */}
      <path
        d="M 28 17 C 34 15 42 15 50 15 C 58 15 66 15 72 17 L 73 21 L 27 21 Z"
        fill={kiddoColors.lime}
        opacity="0.55"
      />
      {/* Stand arm */}
      <line x1="50" y1="60" x2="50" y2="90" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Stand pole */}
      <line x1="50" y1="90" x2="50" y2="130" stroke={color} strokeWidth={strokeWidth + 0.5} strokeLinecap="round" />
      {/* Base tripod */}
      <line x1="50" y1="128" x2="20" y2="138" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="50" y1="128" x2="50" y2="138" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="50" y1="128" x2="80" y2="138" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Light rays */}
      <line x1="28" y1="10" x2="14" y2="2" stroke={kiddoColors.lime} strokeWidth={2} strokeLinecap="round" opacity="0.7" />
      <line x1="50" y1="8" x2="50" y2="0" stroke={kiddoColors.lime} strokeWidth={2} strokeLinecap="round" opacity="0.7" />
      <line x1="72" y1="10" x2="86" y2="2" stroke={kiddoColors.lime} strokeWidth={2} strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
