"use client";

import Link from "next/link";
import { Gavel, Menu, X } from "lucide-react";
import { useState } from "react";

import { BrandMark } from "@/components/brand-mark";

type SiteHeaderProps = {
  isHome?: boolean;
  onPlaceBid?: () => void;
  bidDisabled?: boolean;
};

const navItems = [
  { label: "Leaderboard", hash: "leaderboard" },
  { label: "How it works", hash: "how-it-works" },
  { label: "Rules", hash: "rules" },
] as const;

export function SiteHeader({ isHome = false, onPlaceBid, bidDisabled = false }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const prefix = isHome ? "" : "/";

  const closeMenu = () => setMenuOpen(false);
  const placeBid = () => {
    closeMenu();
    onPlaceBid?.();
  };

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[70] -translate-y-24 rounded-lg bg-[#67e85f] px-4 py-2 text-sm font-bold text-[#071006] transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07090b]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="TopMySaaS home"
            className="group flex min-w-0 items-center gap-3 rounded-md"
            onClick={closeMenu}
          >
            <BrandMark
              size={40}
              className="h-10 w-10 transition-transform duration-200 group-hover:scale-[1.04]"
            />
            <span className="min-w-0">
              <span className="block text-[17px] font-bold leading-5 tracking-[-0.02em] text-white">
                TopMySaaS
              </span>
              <span className="hidden text-[11px] leading-4 text-[#8f98a1] sm:block">
                Five spots. Highest bid wins.
              </span>
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.hash}
                href={`${prefix}#${item.hash}`}
                className="rounded-sm text-sm font-medium text-[#aab2ba] transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/terms"
              className="rounded-sm text-sm font-medium text-[#aab2ba] transition-colors hover:text-white"
            >
              Terms
            </Link>
            {onPlaceBid ? (
              <button
                type="button"
                onClick={placeBid}
                disabled={bidDisabled}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-4 text-sm font-bold text-[#071006] shadow-[0_0_24px_rgba(103,232,95,0.12)] transition-colors hover:bg-[#78f271] active:bg-[#52ce4c] disabled:cursor-not-allowed disabled:bg-[#36453a] disabled:text-[#89948b]"
              >
                <Gavel aria-hidden="true" size={16} strokeWidth={2.4} />
                Place a bid
              </button>
            ) : (
              <Link
                href="/#bid"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-4 text-sm font-bold text-[#071006] shadow-[0_0_24px_rgba(103,232,95,0.12)] transition-colors hover:bg-[#78f271] active:bg-[#52ce4c]"
              >
                <Gavel aria-hidden="true" size={16} strokeWidth={2.4} />
                Place a bid
              </Link>
            )}
          </nav>

          <button
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-controls="mobile-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-white transition-colors hover:bg-white/[0.07] md:hidden"
          >
            {menuOpen ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={21} />}
          </button>
        </div>

        {menuOpen ? (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="border-t border-white/10 bg-[#0b0e11] px-4 py-4 md:hidden"
          >
            <div className="mx-auto flex max-w-[1200px] flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.hash}
                  href={`${prefix}#${item.hash}`}
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-3 text-[15px] font-medium text-[#d4d9dd] hover:bg-white/[0.05] hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/terms"
                onClick={closeMenu}
                className="rounded-lg px-3 py-3 text-[15px] font-medium text-[#d4d9dd] hover:bg-white/[0.05] hover:text-white"
              >
                Terms
              </Link>
              {onPlaceBid ? (
                <button
                  type="button"
                  onClick={placeBid}
                  disabled={bidDisabled}
                  className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-4 text-[15px] font-bold text-[#071006] disabled:cursor-not-allowed disabled:bg-[#36453a] disabled:text-[#89948b]"
                >
                  <Gavel aria-hidden="true" size={17} />
                  Place a bid
                </button>
              ) : (
                <Link
                  href="/#bid"
                  onClick={closeMenu}
                  className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-4 text-[15px] font-bold text-[#071006]"
                >
                  <Gavel aria-hidden="true" size={17} />
                  Place a bid
                </Link>
              )}
            </div>
          </nav>
        ) : null}
      </header>
    </>
  );
}
