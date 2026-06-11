import type { ReactNode } from "react";

import { LayoutShell } from "@/shared/ui";

export default function StoreLayout({ children }: { children: ReactNode }) {
    return <LayoutShell>{children}</LayoutShell>;
}
