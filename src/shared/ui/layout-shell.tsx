"use client";

import Box from "@mui/material/Box";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { usePathname } from "@/i18n/server";
import { PageTransition } from "@/shared/ui/page-transition";

import { LayoutToastSnackbar } from "./layout-toast-snackbar";
import { StoreHeader } from "./store-header";

const cartDrawerImport = () =>
    import("./cart-drawer").then((m) => m.CartDrawer);

const CartDrawer = dynamic(cartDrawerImport, { ssr: false });
const MobileBottomNav = dynamic(
    () => import("./mobile-bottom-nav").then((m) => m.MobileBottomNav),
    { ssr: false },
);
const StoreFooter = dynamic(
    () => import("./store-footer").then((m) => m.StoreFooter),
    { ssr: false, loading: () => null },
);
const NetworkStatus = dynamic(
    () => import("./network-status").then((m) => m.NetworkStatus),
    { ssr: false },
);
const PullToRefresh = dynamic(
    () => import("./pull-to-refresh").then((m) => m.PullToRefresh),
    { ssr: false },
);
import { SearchOverlay } from "./search-overlay";

type LayoutShellProps = { children: ReactNode };

export function LayoutShell({ children }: LayoutShellProps) {
    const pathname = usePathname();
    const tCommon = useTranslations("common");
    const isAdminRoute =
        typeof pathname === "string" && pathname.startsWith("/admin");

    const [searchOpen, setSearchOpen] = useState(false);

    // Warm cart-drawer chunk so first open is not blocked by dynamic import (INP).
    useEffect(() => {
        if (isAdminRoute) return;
        let cancelled = false;
        const preload = () => {
            if (!cancelled) void cartDrawerImport();
        };
        let idleId: number | undefined;
        let timeoutId: number | undefined;
        if (typeof window.requestIdleCallback === "function") {
            idleId = window.requestIdleCallback(preload, { timeout: 3000 });
        } else {
            timeoutId = window.setTimeout(preload, 1800);
        }
        return () => {
            cancelled = true;
            if (idleId != null) window.cancelIdleCallback?.(idleId);
            if (timeoutId != null) window.clearTimeout(timeoutId);
        };
    }, [isAdminRoute]);

    /** Админка - отдельный layout (src/app/admin), без витринного хедера и корзины. */
    if (isAdminRoute) {
        return <>{children}</>;
    }

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
            <Box
                component="a"
                href="#main-content"
                sx={{
                    position: "absolute",
                    left: -9999,
                    top: 8,
                    zIndex: 2000,
                    px: 2,
                    py: 1,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    borderRadius: 1,
                    fontWeight: 700,
                    textDecoration: "none",
                    "&:focus": { left: 8 },
                }}
            >
                {tCommon("aria.skipToContent")}
            </Box>

            <StoreHeader onOpenSearch={() => setSearchOpen(true)} />
            <LayoutToastSnackbar />

            <Box
                component="main"
                id="main-content"
                sx={{
                    flex: 1,
                    pb: {
                        xs: "calc(80px + env(safe-area-inset-bottom))",
                        sm: 4,
                    },
                    display: "flex",
                    flexDirection: "column",
                    minHeight: {
                        xs: "calc(100vh - 56px - env(safe-area-inset-top))",
                        sm: "calc(100vh - 64px)",
                    },
                    overflow: "visible",
                    maxWidth: "100%",
                }}
            >
                <PageTransition>{children}</PageTransition>
                <StoreFooter />
            </Box>

            <PullToRefresh />
            <CartDrawer />
            <NetworkStatus />
            <SearchOverlay
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
            />
            {!pathname.startsWith("/checkout") && <MobileBottomNav />}
        </Box>
    );
}
