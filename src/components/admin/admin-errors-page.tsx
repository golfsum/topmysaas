"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { AdminLogo } from "./admin-logo";
import { ErrorsSection } from "./errors-section";

export function AdminErrorsPage() {
  const router = useRouter();
  const handleUnauthorized = useCallback(() => {
    router.replace("/admin/login");
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070909] text-zinc-100">
      <header className="border-b border-white/8 bg-[#090b0b]">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <AdminLogo compact />
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/8 px-3.5 text-xs font-medium text-zinc-400 transition hover:border-white/15 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Dashboard
            </Link>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-11 items-center gap-2 rounded-lg border border-white/8 px-3.5 text-xs font-medium text-zinc-400 transition hover:border-white/15 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] sm:inline-flex"
            >
              View board
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
        <ErrorsSection refreshKey={0} onUnauthorized={handleUnauthorized} />
      </main>
    </div>
  );
}
