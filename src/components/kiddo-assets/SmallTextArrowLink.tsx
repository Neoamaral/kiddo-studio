"use client";
import { kiddoColors } from "./kiddoColors";
import { ScribbleArrowIcon } from "./ScribbleArrowIcon";

interface SmallTextArrowLinkProps {
  label: string;
  href?: string;
  color?: string;
  underlineColor?: string;
  className?: string;
  onClick?: () => void;
}

export function SmallTextArrowLink({
  label,
  href,
  color = kiddoColors.black,
  underlineColor = kiddoColors.lime,
  className = "",
  onClick,
}: SmallTextArrowLinkProps) {
  const inner = (
    <span className="inline-flex items-center gap-3 group cursor-pointer">
      <span className="relative">
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color, fontFamily: "'Arial', sans-serif" }}
        >
          {label}
        </span>
        {/* Brush underline — shows on hover */}
        <span
          className="absolute left-0 bottom-[-3px] w-full h-[3px] transition-opacity opacity-0 group-hover:opacity-100"
          style={{ background: underlineColor }}
        />
      </span>
      <ScribbleArrowIcon variant="right" width={40} height={16} color={color} strokeWidth={2} />
    </span>
  );

  if (href) {
    return (
      <a href={href} className={`inline-block ${className}`}>
        {inner}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={`inline-block ${className}`}>
      {inner}
    </button>
  );
}
