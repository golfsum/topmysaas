import Link from "next/link";

export function AdminLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#67e85f]"
      aria-label="TopMySaaS home"
    >
      <span
        className="flex h-10 w-10 items-end justify-center gap-0.5 rounded-xl border border-[#67e85f]/20 bg-[#67e85f]/10 px-2 pb-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        aria-hidden="true"
      >
        <span className="h-2 w-1.5 rounded-sm bg-[#93f58c] transition-colors group-hover:bg-[#adf9a7]" />
        <span className="h-3.5 w-1.5 rounded-sm bg-[#67e85f] transition-colors group-hover:bg-[#83f17b]" />
        <span className="h-5 w-1.5 rounded-sm bg-[#49c942] transition-colors group-hover:bg-[#67e85f]" />
        <span className="h-6.5 w-1.5 rounded-sm bg-[#93f58c] transition-colors group-hover:bg-[#adf9a7]" />
      </span>
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
