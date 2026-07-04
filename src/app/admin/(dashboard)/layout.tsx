import type { ReactNode } from "react";

import { requireAdminSession } from "@/lib/admin-auth-server";

import { AdminShell } from "../ui/admin-sidebar";

export default async function AdminDashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requireAdminSession();

    return <AdminShell>{children}</AdminShell>;
}
