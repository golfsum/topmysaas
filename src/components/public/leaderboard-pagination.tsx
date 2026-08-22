import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type LeaderboardPaginationProps = {
  currentPage: number;
  totalPages: number;
  totalListings: number;
  startRank: number;
  endRank: number;
};

type PageItem = number | `ellipsis-${string}`;

const LINK_CLASS =
  "inline-flex h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f]";

function pageHref(page: number): string {
  return page === 1 ? "/#leaderboard" : `/?page=${page}#leaderboard`;
}

function visiblePageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])]
    .filter((page) => page >= 1 && page <= totalPages)
    .toSorted((left, right) => left - right);
  const items: PageItem[] = [];

  for (const page of pages) {
    const previous = items.at(-1);
    if (typeof previous === "number" && page - previous > 1) {
      items.push(`ellipsis-${previous}-${page}`);
    }
    items.push(page);
  }

  return items;
}

export function LeaderboardPagination({
  currentPage,
  totalPages,
  totalListings,
  startRank,
  endRank,
}: LeaderboardPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Leaderboard pages"
      className="mt-5 flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-[#aab2ba]">
        Showing ranks{" "}
        <span className="font-semibold text-white">
          #{startRank}–#{endRank}
        </span>{" "}
        of {totalListings.toLocaleString("en-US")}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {currentPage > 1 ? (
          <Link
            href={pageHref(currentPage - 1)}
            prefetch={false}
            aria-label={`Go to leaderboard page ${currentPage - 1}`}
            className={`${LINK_CLASS} border-white/10 bg-white/[0.035] text-[#c8ced3] hover:border-white/20 hover:bg-white/[0.07] hover:text-white`}
          >
            <ChevronLeft aria-hidden="true" size={16} />
            <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={`${LINK_CLASS} cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-[#59616a]`}
          >
            <ChevronLeft aria-hidden="true" size={16} />
            <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
          </span>
        )}

        {visiblePageItems(currentPage, totalPages).map((item) =>
          typeof item === "number" ? (
            item === currentPage ? (
              <span
                key={item}
                aria-current="page"
                aria-label={`Leaderboard page ${item}, current page`}
                className={`${LINK_CLASS} border-[#67e85f]/30 bg-[#67e85f]/12 text-[#83f27c]`}
              >
                {item}
              </span>
            ) : (
              <Link
                key={item}
                href={pageHref(item)}
                prefetch={false}
                aria-label={`Go to leaderboard page ${item}`}
                className={`${LINK_CLASS} border-white/10 bg-white/[0.035] text-[#c8ced3] hover:border-[#67e85f]/25 hover:bg-[#67e85f]/8 hover:text-[#83f27c]`}
              >
                {item}
              </Link>
            )
          ) : (
            <span
              key={item}
              aria-hidden="true"
              className="inline-flex h-11 min-w-7 items-center justify-center text-sm text-[#747e87]"
            >
              …
            </span>
          ),
        )}

        {currentPage < totalPages ? (
          <Link
            href={pageHref(currentPage + 1)}
            prefetch={false}
            aria-label={`Go to leaderboard page ${currentPage + 1}`}
            className={`${LINK_CLASS} border-white/10 bg-white/[0.035] text-[#c8ced3] hover:border-white/20 hover:bg-white/[0.07] hover:text-white`}
          >
            <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={`${LINK_CLASS} cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-[#59616a]`}
          >
            <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
            <ChevronRight aria-hidden="true" size={16} />
          </span>
        )}
      </div>
    </nav>
  );
}
