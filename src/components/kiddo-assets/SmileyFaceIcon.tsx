"use client";
import { kiddoColors } from "./kiddoColors";
import type { BaseIconProps } from "./kiddoStyles";

interface SmileyFaceIconProps extends BaseIconProps {
  variant?: "clean" | "drip";
  fill?: string;
}

export function SmileyFaceIcon({
  variant = "clean",
  width = 120,
  height = variant === "drip" ? 160 : 120,
  color = kiddoColors.black,
  fill = kiddoColors.lime,
  strokeWidth = 3,
  className = "",
}: SmileyFaceIconProps) {
  if (variant === "drip") {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 120 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Main circle — slightly imperfect */}
        <path
          d="M 58 6 C 82 4 108 22 112 48 C 116 74 104 102 80 112 C 56 122 26 112 14 88 C 2 64 8 34 28 18 C 40 10 48 7 58 6 Z"
          fill={fill}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        {/* Left eye — vertical oval */}
        <ellipse cx="42" cy="52" rx="5" ry="8" fill={color} />
        {/* Right eye */}
        <ellipse cx="76" cy="50" rx="5" ry="8" fill={color} />
        {/* Smile — imperfect arc */}
        <path
          d="M 34 76 C 42 90 58 98 78 86 C 86 82 90 76 90 74"
          stroke={color}
          strokeWidth={strokeWidth + 0.5}
          strokeLinecap="round"
          fill="none"
        />
        {/* Paint drips */}
        <path
          d="M 44 115 C 43 120 42 128 42 136 C 42 142 44 148 47 148 C 50 148 52 142 52 136 C 52 128 51 120 50 114"
          fill={fill}
          stroke={color}
          strokeWidth={1.5}
        />
        <path
          d="M 60 118 C 59 124 59 132 59 138 C 59 144 61 150 64 150 C 67 150 68 144 68 138 C 68 131 67 123 66 118"
          fill={fill}
          stroke={color}
          strokeWidth={1.5}
        />
        <path
          d="M 76 114 C 75 120 74 130 74 140 C 74 146 76 152 79 153 C 82 154 84 148 84 141 C 84 131 83 120 82 114"
          fill={fill}
          stroke={color}
          strokeWidth={1.5}
        />
        {/* Drip tips */}
        <ellipse cx="47" cy="149" rx="5" ry="4" fill={fill} stroke={color} strokeWidth={1} />
        <ellipse cx="64" cy="151" rx="5" ry="4" fill={fill} stroke={color} strokeWidth={1} />
        <ellipse cx="79" cy="154" rx="5" ry="4" fill={fill} stroke={color} strokeWidth={1} />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Imperfect circle outline */}
      <path
        d="M 50 8 C 68 6 88 18 92 40 C 96 60 86 82 66 90 C 46 98 22 88 12 68 C 2 48 10 22 28 12 C 36 8 44 9 50 8 Z"
        fill={fill === kiddoColors.lime ? "transparent" : fill}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Left eye */}
      <ellipse cx="36" cy="42" rx="4" ry="7" fill={color} />
      {/* Right eye */}
      <ellipse cx="64" cy="40" rx="4" ry="7" fill={color} />
      {/* Smile */}
      <path
        d="M 28 62 C 36 76 54 80 70 70 C 76 66 78 62 78 60"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
