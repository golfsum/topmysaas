import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

export function LegalPage({ eyebrow, title, intro, children }: LegalPageProps) {
  return (
    <div className="min-h-screen text-white">
      <SiteHeader />
      <main id="main-content" className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <article className="mx-auto w-full max-w-[740px]">
          <header className="border-b border-white/10 pb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#67e85f]">{eyebrow}</p>
            <h1 className="mt-3 text-[38px] font-extrabold leading-tight tracking-[-0.045em] sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#aab2ba]">{intro}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.08em] text-[#747e87]">
              Last updated August 22, 2026
            </p>
          </header>
          <div className="mt-9 space-y-10 text-[15px] leading-7 text-[#b8c0c7] [&_a]:font-semibold [&_a]:text-[#79ed72] [&_a]:underline [&_a]:decoration-[#79ed72]/30 [&_a]:underline-offset-2 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-[-0.025em] [&_h2]:text-white [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-[#e9edf0] [&_ul]:space-y-3">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
