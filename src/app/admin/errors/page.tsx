import { redirect } from "next/navigation";

import { AdminErrorsPage } from "@/components/admin/admin-errors-page";
import { getAdminSession } from "@/lib/server/admin-auth";

export default async function AdminSystemErrorsPage() {
  if (!(await getAdminSession())) {
    redirect("/admin/login");
  }

  return <AdminErrorsPage />;
}
