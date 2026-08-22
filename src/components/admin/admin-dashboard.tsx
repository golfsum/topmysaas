"use client";

import {
  Activity,
  ExternalLink,
  Gavel,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Settings,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type {
  AdminDashboardData,
  AdminListing,
  BoardSettings,
} from "@/lib/domain/types";
import type { AdminListingInput } from "@/lib/domain/validation";

import { AdminLogo } from "./admin-logo";
import { BidsSection } from "./bids-section";
import { ConfirmDialog, ListingDialog } from "./admin-dialogs";
import { ListingsSection } from "./listings-section";
import { OverviewSection, type AdminView } from "./overview-section";
import { SettingsSection } from "./settings-section";

type AdminAction =
  | { action: "createListing"; listing: AdminListingInput }
  | { action: "updateListing"; id: string; listing: AdminListingInput }
  | { action: "setVisibility"; id: string; isActive: boolean }
  | { action: "deleteListing"; id: string }
  | { action: "resetBoard" }
  | { action: "updateSettings"; settings: BoardSettings };

type OpenDialog =
  | { type: "listing"; listing?: AdminListing }
  | { type: "visibility"; listing: AdminListing }
  | { type: "delete"; listing: AdminListing }
  | { type: "reset" }
  | null;

type Notice = { tone: "success" | "error"; message: string };

const navItems: Array<{
  id: AdminView;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "listings", label: "Listings", icon: Trophy },
  { id: "bids", label: "Recent bids", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

async function getResponseError(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}.`;

  try {
    const body = (await response.json()) as {
      error?: unknown;
      message?: unknown;
    };

    if (typeof body.error === "string") {
      return body.error;
    }
    if (typeof body.message === "string") {
      return body.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function NavButton({
  item,
  activeView,
  onSelect,
  compact = false,
}: {
  item: (typeof navItems)[number];
  activeView: AdminView;
  onSelect: (view: AdminView) => void;
  compact?: boolean;
}) {
  const Icon = item.icon;
  const isActive = activeView === item.id;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={isActive ? "page" : undefined}
      className={`inline-flex min-h-11 items-center gap-3 rounded-xl text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] ${
        compact ? "shrink-0 px-3.5" : "w-full px-3"
      } ${
        isActive
          ? "bg-[#67e85f]/10 text-[#86f27f] shadow-[inset_0_0_0_1px_rgba(103,232,95,0.10)]"
          : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {item.label}
    </button>
  );
}

export function AdminDashboard({
  initialData,
}: {
  initialData: AdminDashboardData;
}) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(initialData);
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const goToLogin = useCallback(() => {
    router.replace("/admin/login");
    router.refresh();
  }, [router]);

  const refreshDashboard = useCallback(
    async (showSuccess = false): Promise<boolean> => {
      setIsRefreshing(true);

      try {
        const response = await fetch("/api/admin", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (response.status === 401) {
          goToLogin();
          return false;
        }

        if (!response.ok) {
          throw new Error(await getResponseError(response));
        }

        const body = (await response.json()) as {
          dashboard: AdminDashboardData;
        };
        setDashboard(body.dashboard);
        if (showSuccess) {
          setNotice({ tone: "success", message: "Dashboard data refreshed." });
        }
        return true;
      } catch (error) {
        setNotice({
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "The dashboard could not be refreshed.",
        });
        return false;
      } finally {
        setIsRefreshing(false);
      }
    },
    [goToLogin],
  );

  async function performAction(
    payload: AdminAction,
    successMessage: string,
  ): Promise<boolean> {
    if (isMutating) {
      return false;
    }

    setIsMutating(true);
    setNotice(null);

    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        goToLogin();
        return false;
      }

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      const body = (await response.json()) as {
        dashboard?: AdminDashboardData;
      };

      if (body.dashboard) {
        setDashboard(body.dashboard);
      } else if (!(await refreshDashboard())) {
        setNotice({
          tone: "error",
          message: `${successMessage} The saved change could not be reloaded yet. Refresh the dashboard before trying it again.`,
        });
        return true;
      }

      setNotice({ tone: "success", message: successMessage });
      return true;
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error ? error.message : "The admin action failed.",
      });
      return false;
    } finally {
      setIsMutating(false);
    }
  }

  function showDialog(dialog: Exclude<OpenDialog, null>) {
    setNotice(null);
    setOpenDialog(dialog);
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }
      goToLogin();
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Sign out failed.",
      });
      setIsLoggingOut(false);
    }
  }

  function renderActiveView() {
    switch (activeView) {
      case "listings":
        return (
          <ListingsSection
            listings={dashboard.listings}
            onAdd={() => showDialog({ type: "listing" })}
            onEdit={(listing) => showDialog({ type: "listing", listing })}
            onToggleVisibility={(listing) =>
              showDialog({ type: "visibility", listing })
            }
            onDelete={(listing) => showDialog({ type: "delete", listing })}
            onReset={() => showDialog({ type: "reset" })}
          />
        );
      case "bids":
        return <BidsSection bids={dashboard.recentBids} />;
      case "settings":
        return (
          <SettingsSection
            key={`${dashboard.settings.minBidCents}-${dashboard.settings.minIncrementCents}-${dashboard.settings.checkoutCloseMinutes}`}
            settings={dashboard.settings}
            isBusy={isMutating}
            onSave={(settings) =>
              performAction(
                { action: "updateSettings", settings },
                "Board settings saved.",
              )
            }
          />
        );
      default:
        return (
          <OverviewSection dashboard={dashboard} onNavigate={setActiveView} />
        );
    }
  }

  return (
    <div className="min-h-screen bg-[#070909] text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/8 bg-[#090b0b] px-4 py-5 lg:flex">
        <div className="px-2">
          <AdminLogo />
        </div>
        <nav className="mt-10 space-y-1.5" aria-label="Admin navigation">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              activeView={activeView}
              onSelect={setActiveView}
            />
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-white/8 bg-white/[0.025] p-3.5">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-[#67e85f] shadow-[0_0_10px_rgba(103,232,95,0.55)]" />
            Protected session
          </div>
          <p className="mt-2 text-[11px] leading-5 text-zinc-600">
            Every mutation is verified again on the server.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-white/8 bg-[#070909]/90 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="lg:hidden">
              <AdminLogo compact />
            </div>
            <div className="hidden items-center gap-2 text-xs text-zinc-500 lg:flex">
              <Gavel className="h-4 w-4 text-[#67e85f]" aria-hidden="true" />
              Week <span className="font-mono text-zinc-300">{dashboard.weekId}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => void refreshDashboard(true)}
                disabled={isRefreshing || isMutating}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Refresh dashboard"
                title="Refresh dashboard"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    isRefreshing
                      ? "animate-spin motion-reduce:animate-none"
                      : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden min-h-11 items-center gap-2 rounded-lg border border-white/8 px-3.5 text-xs font-medium text-zinc-400 transition hover:border-white/15 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] sm:inline-flex"
              >
                View board
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <button
                type="button"
                aria-label={isLoggingOut ? "Signing out" : "Sign out"}
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/8 px-3 text-xs font-medium text-zinc-400 transition hover:border-white/15 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {isLoggingOut ? "Signing out" : "Sign out"}
                </span>
              </button>
            </div>
          </div>

          <nav
            className="flex gap-1 overflow-x-auto border-t border-white/6 px-4 py-2 [scrollbar-width:none] sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden"
            aria-label="Admin navigation"
          >
            {navItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                activeView={activeView}
                onSelect={setActiveView}
                compact
              />
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
          {notice ? (
            <div
              className={`mb-6 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
                notice.tone === "success"
                  ? "border-[#67e85f]/20 bg-[#67e85f]/8 text-[#a4f89e]"
                  : "border-red-400/20 bg-red-400/8 text-red-200"
              }`}
              role={notice.tone === "error" ? "alert" : "status"}
            >
              <p className="leading-5">{notice.message}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="-my-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-current opacity-60 transition hover:bg-white/10 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {renderActiveView()}
        </main>
      </div>

      {openDialog?.type === "listing" ? (
        <ListingDialog
          key={openDialog.listing?.id ?? "new-listing"}
          listing={openDialog.listing}
          isBusy={isMutating}
          errorMessage={notice?.tone === "error" ? notice.message : undefined}
          onClose={() => setOpenDialog(null)}
          onSubmit={(listing) =>
            openDialog.listing
              ? performAction(
                  {
                    action: "updateListing",
                    id: openDialog.listing.id,
                    listing,
                  },
                  `${listing.name} was updated.`,
                )
              : performAction(
                  { action: "createListing", listing },
                  `${listing.name} was added to the board.`,
                )
          }
        />
      ) : null}

      {openDialog?.type === "visibility" ? (
        <ConfirmDialog
          title={`${openDialog.listing.isActive ? "Hide" : "Show"} ${
            openDialog.listing.name
          }?`}
          description={
            openDialog.listing.isActive
              ? "This listing will disappear from the public ranking immediately. Its paid total and bid history stay intact."
              : "This listing will become eligible for the public ranking again at its current paid total."
          }
          confirmLabel={openDialog.listing.isActive ? "Hide listing" : "Show listing"}
          tone="warning"
          isBusy={isMutating}
          errorMessage={notice?.tone === "error" ? notice.message : undefined}
          onClose={() => setOpenDialog(null)}
          onConfirm={() =>
            performAction(
              {
                action: "setVisibility",
                id: openDialog.listing.id,
                isActive: !openDialog.listing.isActive,
              },
              `${openDialog.listing.name} is now ${
                openDialog.listing.isActive ? "hidden" : "active"
              }.`,
            )
          }
        />
      ) : null}

      {openDialog?.type === "delete" ? (
        <ConfirmDialog
          title={`Delete ${openDialog.listing.name}?`}
          description="This removes the listing and invalidates checkouts already in progress. A brand-new paid bid can rejoin later. Use Hide when you need to block bidding until you restore the listing. Payment records remain in bid history."
          confirmLabel="Delete listing"
          isBusy={isMutating}
          errorMessage={notice?.tone === "error" ? notice.message : undefined}
          onClose={() => setOpenDialog(null)}
          onConfirm={() =>
            performAction(
              { action: "deleteListing", id: openDialog.listing.id },
              `${openDialog.listing.name} was deleted.`,
            )
          }
        />
      ) : null}

      {openDialog?.type === "reset" ? (
        <ConfirmDialog
          title="Reset the full board?"
          description="All current listings will be deactivated and the current Top 5 will be archived. Pending checkouts may still settle, but they cannot repopulate the reset board."
          confirmLabel="Reset board"
          tone="danger"
          isBusy={isMutating}
          errorMessage={notice?.tone === "error" ? notice.message : undefined}
          onClose={() => setOpenDialog(null)}
          onConfirm={() =>
            performAction(
              { action: "resetBoard" },
              "The weekly board was reset.",
            )
          }
        />
      ) : null}
    </div>
  );
}
