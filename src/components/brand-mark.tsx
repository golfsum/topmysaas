import Image from "next/image";

type BrandMarkProps = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 40, className = "" }: BrandMarkProps) {
  return (
    <Image
      src="/topmysaas-logo.png"
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      loading="eager"
      draggable={false}
      className={`shrink-0 rounded-full bg-black object-cover ring-1 ring-white/15 ${className}`}
    />
  );
}
