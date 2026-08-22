import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

export function AdminLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#67e85f]"
      aria-label="TopMySaaS home"
    >
      <BrandMark
        size={40}
        className="h-10 w-10 transition-transform duration-200 group-hover:scale-[1.04]"
      />
      <span className={compact ? "sr-only" : "grid leading-none"}>
        <span className="text-[17px] font-semibold tracking-[-0.02em] text-white">
          TopMySaaS
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
          Admin console
        </span>
      </span>
    </Link>
  );
}
