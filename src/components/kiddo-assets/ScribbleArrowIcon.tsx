"use client";
import { kiddoColors } from "./kiddoColors";
import type { BaseIconProps } from "./kiddoStyles";

interface ScribbleArrowProps extends BaseIconProps {
  variant?: "right" | "down" | "diagonal";
}

export function ScribbleArrowIcon({
  variant = "right",
  width,
  height,
  color = kiddoColors.black,
  strokeWidth = 2.5,
  className = "",
}: ScribbleArrowProps) {
  if (variant === "right") {
    const w = width ?? 80;
    const h = height ?? 28;
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 80 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Slightly wavy shaft */}
        <path
          d="M 4 15 C 14 13 24 17 34 14 C 44 11 52 16 62 14"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Arrowhead — slightly askew */}
        <path
          d="M 56 7 C 62 10 68 14 76 14 C 68 16 61 20 56 23"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  if (variant === "down") {
    const w = width ?? 28;
    const h = height ?? 80;
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 28 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Wavy shaft downward */}
        <path
          d="M 15 4 C 13 14 17 24 14 34 C 11 44 16 52 14 62"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Down arrowhead */}
        <path
          d="M 7 56 C 10 62 14 68 14 76 C 16 68 20 61 23 56"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  // diagonal up-right
  const w = width ?? 70;
  const h = height ?? 70;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 70 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Diagonal shaft */}
      <path
        d="M 12 58 C 20 48 28 38 38 30 C 48 22 54 18 62 12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <path
        d="M 38 8 C 46 8 58 8 64 8 C 64 14 64 26 64 34"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
