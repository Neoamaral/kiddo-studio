"use client";

interface KiddoLogoProps {
  color?: "black" | "white";
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { kiddo: "text-2xl", studio: "text-[10px] tracking-[0.25em]" },
  md: { kiddo: "text-4xl", studio: "text-[12px] tracking-[0.25em]" },
  lg: { kiddo: "text-6xl", studio: "text-[14px] tracking-[0.25em]" },
};

export function KiddoLogo({ color = "black", size = "md" }: KiddoLogoProps) {
  const textColor = color === "white" ? "#ffffff" : "#1A1A1A";
  const { kiddo, studio } = sizeMap[size];

  return (
    <div className="flex flex-col leading-none gap-[2px]">
      <span
        className={`font-display ${kiddo} leading-none`}
        style={{ color: textColor, letterSpacing: "-0.02em" }}
      >
        KIDDO
      </span>
      <span
        className={`font-mono ${studio} uppercase`}
        style={{ color: textColor, opacity: 0.7 }}
      >
        STUDIO
      </span>
    </div>
  );
}
