import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | TopMySaaS",
  description: "Manage the TopMySaaS weekly leaderboard.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-[#070909] text-zinc-100">{children}</div>;
}
