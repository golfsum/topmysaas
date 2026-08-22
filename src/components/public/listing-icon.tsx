"use client";

import Image from "next/image";

import { listingFaviconPath } from "@/lib/domain/listing-favicon";

type ListingIconProps = {
  name: string;
  url: string;
  highlighted?: boolean;
  size?: "small" | "medium" | "hero" | "large";
};

const sizeClasses = {
  small: "h-10 w-10 rounded-lg text-xs",
  medium: "h-11 w-11 rounded-xl text-sm",
  hero: "h-14 w-14 rounded-xl text-lg",
  large: "h-16 w-16 rounded-xl text-xl sm:h-[72px] sm:w-[72px] sm:text-2xl",
} as const;

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "S";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function ListingIcon({
  name,
  url,
  highlighted = false,
  size = "medium",
}: ListingIconProps) {
  const faviconPath = listingFaviconPath(url);

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border font-extrabold tracking-[-0.04em] ${sizeClasses[size]} ${
        highlighted
          ? "border-[#67e85f]/35 bg-[#67e85f]/15 text-[#8af384] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-white/10 bg-white/[0.055] text-[#dce1e5]"
      }`}
    >
      <span>{initials(name)}</span>
      {faviconPath ? (
        <Image
          src={faviconPath}
          alt=""
          fill
          unoptimized
          loading="lazy"
          sizes={size === "large" ? "72px" : size === "hero" ? "56px" : "44px"}
          draggable={false}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
          className="bg-[#11161a] object-contain p-[18%]"
        />
      ) : null}
    </span>
  );
}
