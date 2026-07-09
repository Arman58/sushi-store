"use client";

import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import dynamic from "next/dynamic";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { startTransition, useEffect, useState } from "react";

import { Link, useRouter } from "@/i18n/server";
import { tokens } from "@/shared/ui/theme";

const loginDialogImport = () =>
    import("@/features/auth/ui/login-dialog").then((m) => m.LoginDialog);

const LoginDialog = dynamic(loginDialogImport, { ssr: false });

function preloadLoginDialog() {
    void loginDialogImport();
}

export function LoginButton() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const t = useTranslations("auth");
    const tNav = useTranslations("nav");
    const tProfile = useTranslations("profile");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    useEffect(() => {
        let cancelled = false;
        const run = () => {
            if (!cancelled) preloadLoginDialog();
        };
        let idleId: number | undefined;
        let timeoutId: number | undefined;
        if (typeof window.requestIdleCallback === "function") {
            idleId = window.requestIdleCallback(run, { timeout: 2500 });
        } else {
            timeoutId = window.setTimeout(run, 1500);
        }
        return () => {
            cancelled = true;
            if (idleId != null) window.cancelIdleCallback?.(idleId);
            if (timeoutId != null) window.clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        if (!menuAnchor) return;
        const handleScroll = () => setMenuAnchor(null);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [menuAnchor]);

    const isAuthenticated = status === "authenticated" && session?.user?.id != null;
    const displayName = (session?.user?.name ?? "").trim();
    const avatarSrc = session?.user?.image ?? undefined;
    const avatarLabel =
        displayName.length > 0
            ? displayName.charAt(0).toUpperCase()
            : (session?.user?.email ?? "?").charAt(0).toUpperCase();

    const openDialog = () => {
        preloadLoginDialog();
        startTransition(() => setDialogOpen(true));
    };

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        if (isAuthenticated) {
            const target = event.currentTarget;
            startTransition(() => setMenuAnchor(target));
        } else {
            openDialog();
        }
    };

    if (!isAuthenticated) {
        return (
            <>
                <Button
                    variant="text"
                    size="small"
                    startIcon={<PersonOutlineOutlinedIcon />}
                    onClick={openDialog}
                    onPointerEnter={preloadLoginDialog}
                    sx={{
                        display: { xs: "none", sm: "inline-flex" },
                        fontWeight: 600,
                        borderRadius: 2,
                        textTransform: "none",
                        color: "text.primary",
                        "&:hover": { bgcolor: tokens.surfaceHi },
                    }}
                >
                    {t("login")}
                </Button>
                <IconButton
                    onClick={openDialog}
                    onPointerEnter={preloadLoginDialog}
                    aria-label={t("aria.login")}
                    sx={{
                        display: { xs: "flex", sm: "none" },
                        flexShrink: 0,
                        minWidth: 40,
                        minHeight: 40,
                        width: 40,
                        height: 40,
                        alignItems: "center",
                        justifyContent: "center",
                        border: `1px solid ${tokens.border}`,
                        bgcolor: tokens.surface,
                    }}
                >
                    <LoginOutlinedIcon fontSize="small" />
                </IconButton>
                <LoginDialog
                    open={dialogOpen}
                    onClose={() => {
                        if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                        }
                        setDialogOpen(false);
                    }}
                />
            </>
        );
    }

    return (
        <>
            <IconButton
                onClick={handleClick}
                aria-label={t("aria.profileMenu")}
                sx={{
                    p: 0.25,
                    flexShrink: 0,
                    minWidth: 40,
                    minHeight: 40,
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "&:hover": { bgcolor: tokens.surfaceHi },
                }}
            >
                <Avatar
                    src={avatarSrc}
                    alt={displayName || tNav("profile")}
                    sx={{
                        width: 32,
                        height: 32,
                        fontSize: 14,
                        fontWeight: 700,
                        bgcolor: tokens.brand,
                    }}
                >
                    {avatarLabel}
                </Avatar>
            </IconButton>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                TransitionProps={{ timeout: 100 }}
                disableAutoFocusItem
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{ sx: { mt: 0.5, minWidth: 200, borderRadius: 2 } }}
            >
                <MenuItem
                    component={Link}
                    href="/profile"
                    onClick={() => setMenuAnchor(null)}
                    sx={{ gap: 1 }}
                >
                    <PersonOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                    {tNav("profile")}
                </MenuItem>
                <MenuItem
                    component={Link}
                    href="/profile/addresses"
                    onClick={() => setMenuAnchor(null)}
                    sx={{ gap: 1 }}
                >
                    <HomeOutlinedIcon sx={{ fontSize: 18 }} />
                    {tProfile("my_addresses")}
                </MenuItem>
                <MenuItem
                    component={Link}
                    href="/profile/orders"
                    onClick={() => setMenuAnchor(null)}
                    sx={{ gap: 1 }}
                >
                    <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />
                    {tProfile("orderHistory")}
                </MenuItem>
                <MenuItem
                    onClick={async () => {
                        setMenuAnchor(null);
                        await signOut({ redirect: false });
                        router.refresh();
                    }}
                    sx={{ gap: 1 }}
                >
                    <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
                    {t("logout")}
                </MenuItem>
            </Menu>
        </>
    );
}
