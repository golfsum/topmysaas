"use client";

import { Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { MAX_LISTING_SEARCH_LENGTH } from "@/lib/domain/listing-search";

type ListingSearchFormProps = {
  query: string;
  resultCount: number;
};

export function ListingSearchForm({
  query,
  resultCount,
}: ListingSearchFormProps) {
  return (
    <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 sm:p-4">
      <Form
        action="/"
        scroll={false}
        role="search"
        aria-label="Search ranked SaaS listings"
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search listings</span>
          <Search
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8f98a1]"
          />
          <input
            key={query}
            type="search"
            name="q"
            defaultValue={query}
            maxLength={MAX_LISTING_SEARCH_LENGTH}
            autoComplete="off"
            placeholder="Search company, domain, or description"
            className="h-11 w-full rounded-lg border border-white/10 bg-[#090c0f] pl-10 pr-3.5 text-sm text-white placeholder:text-[#74808a] transition-colors hover:border-white/20 focus:border-[#67e85f]/60 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-5 text-sm font-bold text-[#071006] transition-colors hover:bg-[#78f271] active:bg-[#52ce4c]"
        >
          <Search aria-hidden="true" size={15} strokeWidth={2.5} />
          Search
        </button>
        {query ? (
          <Link
            href="/#leaderboard"
            prefetch={false}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-[#c8ced3] transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
          >
            <X aria-hidden="true" size={15} />
            Clear
          </Link>
        ) : null}
      </Form>

      {query ? (
        <p role="status" className="mt-2.5 px-0.5 text-xs text-[#aab2ba]">
          {resultCount.toLocaleString("en-US")} {resultCount === 1 ? "match" : "matches"} for
          {" "}<span className="font-semibold text-white">&ldquo;{query}&rdquo;</span>
        </p>
      ) : null}
    </div>
  );
}
