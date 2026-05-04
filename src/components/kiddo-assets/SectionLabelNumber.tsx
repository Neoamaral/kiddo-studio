"use client";
import { kiddoColors } from "./kiddoColors";

interface SectionLabelNumberProps {
  number: number | string;
  size?: number;
  color?: string;
  className?: string;
}

export function SectionLabelNumber({
  number,
  size = 32,
  color = kiddoColors.black,
  className = "",
}: SectionLabelNumberProps) {
  const label = typeof number === "number" ? String(number).padStart(2, "0") : number;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Slightly imperfect circle */}
      <path
        d="M 16 2 C 22 2 28 7 29 14 C 30 21 26 28 19 30 C 12 32 5 28 3 21
           C 1 14 5 6 12 3 C 13 2 14 2 16 2 Z"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
      />
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fontSize="9"
        fontFamily="'Arial', sans-serif"
        fontWeight="400"
        fill={color}
        letterSpacing="0.5"
      >
        {label}
      </text>
    </svg>
  );
}
