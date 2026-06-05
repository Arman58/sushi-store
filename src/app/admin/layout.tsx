import Box from "@mui/material/Box";
import type { ReactNode } from "react";

/**
 * Корневой layout /admin/* — изолирован от витрины.
 * LayoutShell подключается только в src/app/(store)/layout.tsx.
 * Каркас: sidebar + контент — в AdminShell (admin/(dashboard)/layout.tsx).
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
    return (
        <Box
            component="div"
            data-admin-root
            sx={{
                minHeight: "100vh",
                bgcolor: "background.default",
                color: "text.primary",
            }}
        >
            {children}
        </Box>
    );
}
