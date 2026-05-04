"use client";
import { kiddoColors } from "./kiddoColors";
import type { BaseIconProps } from "./kiddoStyles";

interface StoolSketchIconProps extends BaseIconProps {
  showAccent?: boolean;
}

export function StoolSketchIcon({
  width = 80,
  height = 120,
  color = kiddoColors.black,
  strokeWidth = 2.5,
  showAccent = true,
  className = "",
}: StoolSketchIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 80 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Lime accent blob */}
      {showAccent && (
        <ellipse cx="40" cy="75" rx="30" ry="22" fill={kiddoColors.lime} />
      )}
      {/* Seat top — slightly uneven ellipse */}
      <path
        d="M 8 18 C 12 10 26 8 40 9 C 54 10 68 12 72 18 C 74 22 74 26 72 28
           C 68 32 54 34 40 33 C 26 34 12 32 8 28 C 6 26 6 22 8 18 Z"
        fill="white"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Center pole */}
      <path
        d="M 36 33 C 36 46 38 58 38 72 C 38 82 40 88 40 92"
        stroke={color}
        strokeWidth={strokeWidth + 0.5}
        strokeLinecap="round"
      />
      <path
        d="M 44 33 C 44 46 42 58 42 72 C 42 82 40 88 40 92"
        stroke={color}
        strokeWidth={strokeWidth + 0.5}
        strokeLinecap="round"
      />
      {/* Left front leg */}
      <path
        d="M 38 90 C 36 98 28 106 18 116"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Right front leg */}
      <path
        d="M 42 90 C 44 98 52 106 62 116"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Left back leg */}
      <path
        d="M 37 88 C 34 96 24 104 16 116"
        stroke={color}
        strokeWidth={strokeWidth - 0.5}
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* Right back leg */}
      <path
        d="M 43 88 C 46 96 56 104 64 116"
        stroke={color}
        strokeWidth={strokeWidth - 0.5}
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* Foot rest ring */}
      <path
        d="M 20 88 C 26 84 32 82 40 82 C 48 82 54 84 60 88"
        stroke={color}
        strokeWidth={strokeWidth - 0.5}
        fill="none"
        strokeLinecap="round"
      />
      {/* Cross brace */}
      <line x1="19" y1="98" x2="61" y2="98" stroke={color} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
