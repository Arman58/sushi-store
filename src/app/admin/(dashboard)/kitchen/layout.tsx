import Box from "@mui/material/Box";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "Kitchen Display",
    robots: { index: false, follow: false },
};

export default function KitchenLayout({ children }: { children: ReactNode }) {
    return (
        <Box
            component="div"
            data-kitchen-root
            sx={{
                bgcolor: "#F8FAFC",
                minHeight: "100vh",
                color: "#0F172A",
                fontFamily: "Inter, sans-serif",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {children}
        </Box>
    );
}
