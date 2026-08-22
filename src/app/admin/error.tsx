"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070909] px-4 py-12 text-zinc-100">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1010] p-7 text-center shadow-2xl shadow-black/30">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
          The dashboard could not load
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Verify the Firebase indexes are ready, then try the request again.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#67e85f] px-5 text-sm font-semibold text-[#10200e] transition hover:bg-[#7df175] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7df175]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/admin/errors"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-5 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f]"
          >
            Open system errors
          </Link>
        </div>
      </section>
    </main>
  );
}
