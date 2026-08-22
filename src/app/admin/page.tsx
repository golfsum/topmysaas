import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminSession } from "@/lib/server/admin-auth";
import { getAdminDashboard } from "@/lib/server/admin-data";

export default async function AdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const dashboard = await getAdminDashboard();

  return <AdminDashboard initialData={dashboard} />;
}
