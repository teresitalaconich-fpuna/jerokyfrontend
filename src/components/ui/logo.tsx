import React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: number | string;
}

export function JerokyLogo({ className = "", size = 48 }: LogoProps) {
  const numericSize =
    typeof size === "number"
      ? size
      : typeof size === "string"
      ? parseInt(size, 10) || 48
      : 48;
  return (
    <Image
      src="/logo.svg"
      alt="Jeroky Soft Logo"
      width={numericSize}
      height={numericSize}
      className={`shrink-0 ${className}`}
      priority
    />
  );
}

interface BrandHeaderProps {
  className?: string;
  logoSize?: number;
  stacked?: boolean;
  align?: "left" | "center";
}

export function JerokyBrandHeader({
  className = "",
  logoSize = 40,
  stacked = false,
  align = "left",
}: BrandHeaderProps) {
  if (stacked) {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <JerokyLogo size={logoSize} className="mb-3" />
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-none">
          JEROKY SOFT
        </h1>
        <p className="text-[11px] font-bold text-[#2C58A2] tracking-wider uppercase mt-1.5">
          ACADEMIA DE DANZA JEROKY PARAGUAI
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 ${
        align === "center" ? "justify-center" : "justify-start"
      } ${className}`}
    >
      <JerokyLogo size={logoSize} />
      <div className="flex flex-col">
        <h1 className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">
          JEROKY SOFT
        </h1>
        <p className="text-[10px] font-bold text-[#2C58A2] tracking-wider uppercase leading-tight">
          ACADEMIA DE DANZA JEROKY PARAGUAI
        </p>
      </div>
    </div>
  );
}
