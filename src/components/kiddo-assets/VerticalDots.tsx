"use client";
import { kiddoColors } from "./kiddoColors";

interface VerticalDotsProps {
  count?: number;
  activeIndex?: number;
  color?: string;
  activeColor?: string;
  size?: number;
  gap?: number;
  className?: string;
}

export function VerticalDots({
  count = 3,
  activeIndex = 0,
  color = kiddoColors.black,
  activeColor = kiddoColors.lime,
  size = 7,
  gap = 10,
  className = "",
}: VerticalDotsProps) {
  const totalHeight = count * size + (count - 1) * gap;
  return (
    <svg
      width={size + 2}
      height={totalHeight + 2}
      viewBox={`0 0 ${size + 2} ${totalHeight + 2}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === activeIndex;
        const cy = 1 + i * (size + gap) + size / 2;
        return (
          <circle
            key={i}
            cx={(size + 2) / 2}
            cy={cy}
            r={isActive ? size / 2 + 1 : size / 2}
            fill={isActive ? activeColor : color}
          />
        );
      })}
    </svg>
  );
}
