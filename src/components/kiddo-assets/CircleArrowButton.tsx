"use client";
import { kiddoColors } from "./kiddoColors";

interface CircleArrowButtonProps {
  variant?: "outline" | "filled";
  size?: number;
  color?: string;
  arrowColor?: string;
  strokeWidth?: number;
  className?: string;
  onClick?: () => void;
  direction?: "right" | "left" | "up" | "down";
}

export function CircleArrowButton({
  variant = "filled",
  size = 56,
  color = kiddoColors.lime,
  arrowColor = kiddoColors.black,
  strokeWidth = 2.5,
  className = "",
  onClick,
  direction = "right",
}: CircleArrowButtonProps) {
  const arrowMap = {
    right: "M 20 28 C 26 27 32 28 40 28 M 33 21 C 37 24 42 28 40 28 C 40 28 37 32 33 35",
    left:  "M 40 28 C 34 27 28 28 20 28 M 27 21 C 23 24 18 28 20 28 C 20 28 23 32 27 35",
    down:  "M 28 18 C 27 24 28 30 28 38 M 21 31 C 24 35 28 40 28 38 C 28 38 32 35 35 31",
    up:    "M 28 40 C 27 34 28 28 28 20 M 21 27 C 24 23 28 18 28 20 C 28 20 32 23 35 27",
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Slightly imperfect circle */}
        <path
          d="M 28 4 C 40 4 52 14 52 28 C 52 42 42 52 28 52 C 14 52 4 42 4 28 C 4 14 16 4 28 4 Z"
          fill={variant === "filled" ? color : "transparent"}
          stroke={variant === "outline" ? color : "transparent"}
          strokeWidth={strokeWidth}
        />
        {/* Arrow */}
        <path
          d={arrowMap[direction]}
          stroke={variant === "filled" ? arrowColor : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </button>
  );
}
