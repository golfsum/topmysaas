import {
  Eye,
  EyeOff,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Trophy,
} from "lucide-react";

import { formatUsd } from "@/lib/domain/money";
import type { AdminListing } from "@/lib/domain/types";

type ListingsSectionProps = {
  listings: AdminListing[];
  onAdd: () => void;
  onEdit: (listing: AdminListing) => void;
  onToggleVisibility: (listing: AdminListing) => void;
  onDelete: (listing: AdminListing) => void;
  onReset: () => void;
};

const monogramColors = [
  "from-violet-400 to-fuchsia-500",
  "from-sky-400 to-blue-500",
  "from-emerald-300 to-green-500",
  "from-amber-300 to-orange-500",
  "from-rose-400 to-pink-500",
] as const;

function getMonogramColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return monogramColors[hash % monogramColors.length];
}

function formatUpdatedAt(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

function ListingActions({
  listing,
  onEdit,
  onToggleVisibility,
  onDelete,
}: Pick<
  ListingsSectionProps,
  "onEdit" | "onToggleVisibility" | "onDelete"
> & { listing: AdminListing }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(listing)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f]"
        aria-label={`Edit ${listing.name}`}
        title="Edit listing"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onToggleVisibility(listing)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f]"
        aria-label={`${listing.isActive ? "Hide" : "Show"} ${listing.name}`}
        title={listing.isActive ? "Hide listing" : "Show listing"}
      >
        {listing.isActive ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={() => onDelete(listing)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
        aria-label={`Delete ${listing.name}`}
        title="Delete listing"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ListingsSection({
  listings,
  onAdd,
  onEdit,
  onToggleVisibility,
  onDelete,
  onReset,
}: ListingsSectionProps) {
  const sortedListings = listings.toSorted(
    (left, right) =>
      Number(right.isActive) - Number(left.isActive) ||
      right.bidAmountCents - left.bidAmountCents ||
      left.createdAt.localeCompare(right.createdAt),
  );
  const activeRankById = new Map(
    sortedListings
      .filter((listing) => listing.isActive)
      .map((listing, index) => [listing.id, index + 1]),
  );

  return (
    <section aria-labelledby="listings-title" className="space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#67e85f]">
            Board control
          </p>
          <h1
            id="listings-title"
            className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl"
          >
            Listings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Edit product details, force bid totals, control visibility, or add a
            listing directly.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 text-sm font-medium text-amber-200 transition hover:border-amber-300/30 hover:bg-amber-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset board
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#67e85f] px-4 text-sm font-semibold text-[#10200e] transition hover:bg-[#7df175] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7df175]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add listing
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1010]">
        {sortedListings.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="border-b border-white/8 bg-white/[0.018] text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  <tr>
                    <th className="w-20 px-5 py-3.5 text-center" scope="col">
                      Rank
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Product
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Bid total
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Status
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Updated
                    </th>
                    <th className="px-5 py-3.5 text-right" scope="col">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {sortedListings.map((listing) => {
                    const rank = activeRankById.get(listing.id);
                    return (
                      <tr
                        key={listing.id}
                        className={`transition hover:bg-white/[0.018] ${
                          listing.isActive ? "" : "opacity-65"
                        }`}
                      >
                        <td className="px-5 py-4 text-center font-mono text-sm text-zinc-500 tabular-nums">
                          {rank ? (
                            `#${rank}`
                          ) : (
                            <>
                              <span aria-hidden="true">-</span>
                              <span className="sr-only">Not ranked</span>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getMonogramColor(
                                listing.name,
                              )} text-sm font-bold text-white shadow-lg shadow-black/20`}
                              aria-hidden="true"
                            >
                              {listing.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="truncate font-semibold text-zinc-100">
                                  {listing.name}
                                </span>
                                <a
                                  href={listing.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white/5 hover:text-[#86f27f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f]"
                                  aria-label={`Open ${listing.name} website`}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                </a>
                              </span>
                              <span className="mt-1 block max-w-sm truncate text-xs text-zinc-500">
                                {listing.description}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono font-semibold text-[#86f27f] tabular-nums">
                          {formatUsd(listing.bidAmountCents, true)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                              listing.isActive
                                ? "border-[#67e85f]/15 bg-[#67e85f]/8 text-[#86f27f]"
                                : "border-white/8 bg-white/4 text-zinc-500"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                listing.isActive ? "bg-[#67e85f]" : "bg-zinc-600"
                              }`}
                            />
                            {listing.isActive ? "Active" : "Hidden"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-zinc-500">
                          {formatUpdatedAt(listing.updatedAt)} UTC
                        </td>
                        <td className="px-5 py-4">
                          <ListingActions
                            listing={listing}
                            onEdit={onEdit}
                            onToggleVisibility={onToggleVisibility}
                            onDelete={onDelete}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-white/6 lg:hidden">
              {sortedListings.map((listing) => {
                const rank = activeRankById.get(listing.id);
                return (
                  <li
                    key={listing.id}
                    className={`p-5 ${listing.isActive ? "" : "opacity-65"}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getMonogramColor(
                          listing.name,
                        )} text-sm font-bold text-white`}
                        aria-hidden="true"
                      >
                        {listing.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <a
                              href={listing.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded font-semibold text-zinc-100 hover:text-[#86f27f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f]"
                            >
                              <span className="truncate">{listing.name}</span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            </a>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                              {listing.description}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-sm text-zinc-500">
                            {rank ? (
                              `#${rank}`
                            ) : (
                              <>
                                <span aria-hidden="true">-</span>
                                <span className="sr-only">Not ranked</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/6 pt-3">
                      <div>
                        <p className="font-mono text-sm font-semibold text-[#86f27f] tabular-nums">
                          {formatUsd(listing.bidAmountCents, true)}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">
                          {listing.isActive ? "Active" : "Hidden"}
                        </p>
                      </div>
                      <ListingActions
                        listing={listing}
                        onEdit={onEdit}
                        onToggleVisibility={onToggleVisibility}
                        onDelete={onDelete}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <Trophy className="mx-auto h-7 w-7 text-zinc-600" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-zinc-300">No listings yet</p>
            <p className="mt-1 text-xs text-zinc-500">
              Add the first listing to seed the weekly board.
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#67e85f] px-4 text-sm font-semibold text-[#10200e] transition hover:bg-[#7df175] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7df175]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add listing
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
