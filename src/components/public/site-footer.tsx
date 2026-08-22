import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#06080a]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-8 text-sm text-[#8f98a1] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <p className="font-semibold text-[#d9dee2]">TopMySaaS</p>
          <p className="mt-1">The competitive weekly SaaS leaderboard.</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/terms" className="rounded-sm transition-colors hover:text-white">
            Terms
          </Link>
          <Link href="/privacy" className="rounded-sm transition-colors hover:text-white">
            Privacy
          </Link>
          <a href={SUPPORT_EMAIL_HREF} className="rounded-sm transition-colors hover:text-white">
            Contact: {SUPPORT_EMAIL}
          </a>
          <Link href="/admin" className="rounded-sm transition-colors hover:text-white">
            Admin
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[#747e87]">
            <LockKeyhole aria-hidden="true" size={13} />
            Secure checkout by Stripe
          </span>
        </nav>
      </div>
    </footer>
  );
}
