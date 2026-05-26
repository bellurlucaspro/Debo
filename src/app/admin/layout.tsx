import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/rbac";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Control Tower",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Garde RBAC : redirige les non-admins (vers /login ou /).
  const user = await requireAdmin();

  return (
    <div className="admin-theme min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-[1400px] gap-6 p-4 md:p-6">
        <AdminSidebar name={user.name ?? "DEBO"} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
