"use client";

import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { alpha, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Link, usePathname, useRouter } from "@/i18n/server";

import { tokens } from "./theme";
import { ThemeModeToggle } from "./theme-mode-toggle";

const LoginDialog = dynamic(
    () => import("@/features/auth/ui/login-dialog").then((m) => m.LoginDialog),
    { ssr: false },
);

const LANGUAGES = [
    { code: "hy", label: "Հայերեն", flag: "🇦🇲" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "en", label: "English", flag: "🇬🇧" },
] as const;

const STORE_NAV_HREFS = [
    { href: "/", key: "home" },
    { href: "/menu", key: "menu" },
    { href: "/favorites", key: "favorites" },
    { href: "/contacts", key: "contacts" },
] as const;

const DRAWER_WIDTH = 320;

function DrawerLanguageSwitcher({ onChange }: { onChange?: () => void }) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations("languageSwitcher");

    const handleChange = (newLocale: string) => {
        const qs =
            typeof window !== "undefined"
                ? window.location.search.slice(1)
                : searchParams.toString();
        const href = qs ? `${pathname}?${qs}` : pathname;
        router.replace(href, { locale: newLocale });
        onChange?.();
    };

    return (
        <Box
            role="group"
            aria-label={t("label")}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                flexShrink: 0,
            }}
        >
            {LANGUAGES.map((lang) => {
                const selected = locale === lang.code;
                return (
                    <IconButton
                        key={lang.code}
                        size="small"
                        aria-label={lang.label}
                        aria-pressed={selected}
                        onClick={() => handleChange(lang.code)}
                        sx={{
                            width: 36,
                            height: 36,
                            flexShrink: 0,
                            border: "1px solid",
                            borderColor: selected ? "primary.main" : "divider",
                            bgcolor: selected ? "primary.main" : "background.paper",
                            fontSize: 18,
                            "&:hover": {
                                bgcolor: selected ? "primary.dark" : "action.hover",
                            },
                        }}
                    >
                        {lang.flag}
                    </IconButton>
                );
            })}
        </Box>
    );
}

export function MobileNavDrawer() {
    const pathname = usePathname();
    const router = useRouter();
    const theme = useTheme();
    const t = useTranslations("nav");
    const tAuth = useTranslations("auth");
    const tProfile = useTranslations("profile");
    const tCommon = useTranslations("common");

    const { data: session, status } = useSession();
    const isAuthenticated = status === "authenticated" && session?.user?.id != null;

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [loginDialogOpen, setLoginDialogOpen] = useState(false);

    const closeDrawer = () => {
        setDrawerOpen(false);
        setIsProfileOpen(false);
    };

    const handleNavClick = () => {
        closeDrawer();
    };

    const handleLoginClick = () => {
        closeDrawer();
        setLoginDialogOpen(true);
    };

    const handleLogout = async () => {
        closeDrawer();
        await signOut({ redirect: false });
        router.refresh();
    };

    return (
        <>
            <IconButton
                onClick={() => setDrawerOpen(true)}
                aria-label={tCommon("aria.mobileNavMenu")}
                sx={{
                    display: { xs: "inline-flex", sm: "none" },
                    flexShrink: 0,
                    minWidth: 40,
                    width: 40,
                    height: 40,
                    color: tokens.textPrimary,
                }}
            >
                <MenuIcon aria-hidden focusable="false" />
            </IconButton>

            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={closeDrawer}
                ModalProps={{ keepMounted: false }}
                slotProps={{
                    backdrop: {
                        sx: { bgcolor: alpha(theme.palette.common.black, 0.35) },
                    },
                }}
                PaperProps={{
                    sx: {
                        width: { xs: "100%", sm: DRAWER_WIDTH },
                        maxWidth: "100%",
                        minHeight: "100dvh",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        borderLeft: `1px solid ${tokens.border}`,
                    },
                }}
            >
                {/* Pinned header: languages + close */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        px: 2,
                        py: 1.5,
                        pt: "calc(12px + env(safe-area-inset-top))",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        flexShrink: 0,
                        bgcolor: "background.paper",
                    }}
                >
                    <DrawerLanguageSwitcher />
                    <ThemeModeToggle />
                    <IconButton
                        onClick={closeDrawer}
                        aria-label={tCommon("aria.close")}
                        sx={{ flexShrink: 0 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Scrollable nav + profile */}
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        WebkitOverflowScrolling: "touch",
                    }}
                >
                    <List disablePadding sx={{ py: 1 }}>
                        {STORE_NAV_HREFS.map(({ href, key }) => (
                            <ListItemButton
                                key={href}
                                component={Link}
                                href={href}
                                onClick={handleNavClick}
                                selected={pathname === href}
                                sx={{
                                    py: 1.5,
                                    px: 2.5,
                                    fontWeight: pathname === href ? 700 : 500,
                                }}
                            >
                                <ListItemText
                                    primary={t(key)}
                                    primaryTypographyProps={{ fontWeight: "inherit" }}
                                />
                            </ListItemButton>
                        ))}
                    </List>

                    <Divider />

                    {/* Profile accordion */}
                    <Box sx={{ flexShrink: 0, width: "100%" }}>
                        <ListItemButton
                            onClick={() => setIsProfileOpen((prev) => !prev)}
                            aria-expanded={isProfileOpen}
                            sx={{
                                flexShrink: 0,
                                width: "100%",
                                py: 1.5,
                                px: 2.5,
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <AccountCircleOutlinedIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary={t("profile")}
                                primaryTypographyProps={{ fontWeight: 600 }}
                            />
                            <ExpandMoreIcon
                                sx={{
                                    transition: "transform 0.2s ease",
                                    transform: isProfileOpen
                                        ? "rotate(180deg)"
                                        : "rotate(0deg)",
                                }}
                            />
                        </ListItemButton>

                        <Collapse in={isProfileOpen} timeout="auto" unmountOnExit>
                            <List disablePadding sx={{ pb: 1 }}>
                                {!isAuthenticated ? (
                                    <ListItemButton
                                        onClick={handleLoginClick}
                                        sx={{ pl: 4.5, py: 1.25 }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            <LoginOutlinedIcon sx={{ fontSize: 20 }} />
                                        </ListItemIcon>
                                        <ListItemText primary={tAuth("login")} />
                                    </ListItemButton>
                                ) : (
                                    <>
                                        <ListItemButton
                                            component={Link}
                                            href="/profile"
                                            onClick={handleNavClick}
                                            selected={pathname.startsWith("/profile")}
                                            sx={{ pl: 4.5, py: 1.25 }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <ReceiptLongOutlinedIcon
                                                    sx={{ fontSize: 20 }}
                                                />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={tProfile("orderHistory")}
                                            />
                                        </ListItemButton>
                                        <ListItemButton
                                            onClick={handleLogout}
                                            sx={{ pl: 4.5, py: 1.25 }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <LogoutOutlinedIcon sx={{ fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText primary={tAuth("logout")} />
                                        </ListItemButton>
                                    </>
                                )}
                            </List>
                        </Collapse>
                    </Box>
                </Box>

                <Box
                    sx={{
                        flexShrink: 0,
                        px: 2.5,
                        py: 2,
                        pb: "calc(16px + env(safe-area-inset-bottom))",
                        borderTop: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <Typography variant="caption" sx={{ color: tokens.textMuted }}>
                        {tCommon("brandName")}
                    </Typography>
                </Box>
            </Drawer>

            <LoginDialog
                open={loginDialogOpen}
                onClose={() => setLoginDialogOpen(false)}
            />
        </>
    );
}
