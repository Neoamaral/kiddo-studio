"use client";
import { kiddoColors } from "./kiddoColors";

interface BrushUnderlineProps {
  variant?: "short" | "long" | "double";
  width?: number;
  color?: string;
  className?: string;
}

export function BrushUnderline({
  variant = "long",
  width = variant === "short" ? 120 : variant === "long" ? 280 : 280,
  color = kiddoColors.lime,
  className = "",
}: BrushUnderlineProps) {
  const h = variant === "double" ? 28 : 18;

  if (variant === "short") {
    return (
      <svg
        width={width}
        height={h}
        viewBox="0 0 120 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        preserveAspectRatio="none"
      >
        {/* Thick rough brush stroke */}
        <path
          d="M 4 12 C 16 7 32 15 48 10 C 64 5 80 13 96 9 C 108 6 114 11 118 13"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
        {/* Dry brush texture overlay */}
        <path
          d="M 6 15 C 20 12 40 16 56 13 C 72 10 88 15 104 12 C 112 10 116 14 118 15"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    );
  }

  if (variant === "long") {
    return (
      <svg
        width={width}
        height={h}
        viewBox="0 0 280 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        preserveAspectRatio="none"
      >
        <path
          d="M 4 12 C 24 7 52 15 84 10 C 116 5 144 14 176 9 C 208 4 236 13 260 9 C 268 8 274 11 278 13"
          stroke={color}
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.88"
        />
        {/* Feathered top edge */}
        <path
          d="M 8 8 C 32 5 68 10 104 7 C 140 4 168 9 200 6 C 232 3 258 7 276 9"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          opacity="0.35"
        />
        {/* Feathered bottom */}
        <path
          d="M 12 16 C 44 14 80 17 120 15 C 160 13 192 16 232 14 C 252 13 266 15 278 16"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
    );
  }

  // double
  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 280 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      {/* First stroke */}
      <path
        d="M 4 10 C 28 6 60 12 96 8 C 132 4 164 11 200 7 C 228 4 254 10 276 8"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Second stroke below */}
      <path
        d="M 8 22 C 36 18 72 24 112 20 C 148 16 180 22 216 19 C 244 17 262 21 276 22"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
