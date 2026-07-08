"use client";

import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import Avatar from "@mui/material/Avatar";
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
    { href: "/", key: "home", icon: HomeOutlinedIcon },
    { href: "/menu", key: "menu", icon: MenuBookOutlinedIcon },
    { href: "/favorites", key: "favorites", icon: FavoriteBorderOutlinedIcon },
    { href: "/contacts", key: "contacts", icon: PhoneOutlinedIcon },
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
                            bgcolor: selected ? "rgba(39, 174, 96, 0.12)" : "background.paper",
                            fontSize: 18,
                            "&:hover": {
                                bgcolor: selected ? "rgba(39, 174, 96, 0.2)" : "action.hover",
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
                        {STORE_NAV_HREFS.map(({ href, key, icon: Icon }) => (
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
                                    color: pathname === href ? tokens.brand : "text.primary",
                                    bgcolor: pathname === href ? "rgba(39, 174, 96, 0.04)" : "transparent",
                                    borderLeft: pathname === href ? `4px solid ${tokens.brand}` : "4px solid transparent",
                                    transition: "all 0.2s ease",
                                    "&.Mui-selected": {
                                        bgcolor: "rgba(39, 174, 96, 0.04)",
                                        color: tokens.brand,
                                        "& .MuiListItemIcon-root": {
                                            color: tokens.brand,
                                        },
                                    },
                                    "& .MuiListItemIcon-root": {
                                        color: pathname === href ? tokens.brand : "text.secondary",
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <Icon sx={{ fontSize: 22 }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={t(key)}
                                    primaryTypographyProps={{ fontWeight: "inherit", fontSize: "0.95rem" }}
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
                                py: 1.75,
                                px: 2.5,
                                borderLeft: isProfileOpen ? `4px solid ${tokens.brand}` : "4px solid transparent",
                                bgcolor: isProfileOpen ? "rgba(39, 174, 96, 0.02)" : "transparent",
                                transition: "all 0.25s ease",
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                {isAuthenticated && session?.user?.image ? (
                                    <Avatar
                                        src={session.user.image}
                                        alt={session.user.name || ""}
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            border: `1.5px solid ${tokens.brand}`,
                                        }}
                                    />
                                ) : isAuthenticated ? (
                                    <Avatar
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            bgcolor: tokens.brand,
                                            fontSize: "0.85rem",
                                            fontWeight: 800,
                                            color: "#fff",
                                        }}
                                    >
                                        {(session.user.name || "U").charAt(0).toUpperCase()}
                                    </Avatar>
                                ) : (
                                    <AccountCircleOutlinedIcon sx={{ color: "text.secondary" }} />
                                )}
                            </ListItemIcon>
                            <ListItemText
                                primary={isAuthenticated ? (session.user.name || tProfile("defaultName")) : t("profile")}
                                secondary={isAuthenticated ? session.user.email : null}
                                primaryTypographyProps={{
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                    color: isProfileOpen ? tokens.brand : "text.primary"
                                }}
                                secondaryTypographyProps={{
                                    variant: "caption",
                                    color: "text.secondary",
                                    sx: { display: "block", mt: 0.25 }
                                }}
                            />
                            <ExpandMoreIcon
                                sx={{
                                    transition: "transform 0.2s ease",
                                    transform: isProfileOpen
                                        ? "rotate(180deg)"
                                        : "rotate(0deg)",
                                    color: isProfileOpen ? tokens.brand : "text.secondary",
                                }}
                            />
                        </ListItemButton>

                        <Collapse in={isProfileOpen} timeout="auto" unmountOnExit>
                            <List disablePadding sx={{ pb: 1, bgcolor: "rgba(39, 174, 96, 0.01)" }}>
                                {!isAuthenticated ? (
                                    <ListItemButton
                                        onClick={handleLoginClick}
                                        sx={{ pl: 7, py: 1.25 }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            <LoginOutlinedIcon sx={{ fontSize: 20 }} />
                                        </ListItemIcon>
                                        <ListItemText primary={tAuth("login")} />
                                    </ListItemButton>
                                ) : (
                                    <>
                                        {/* My Profile Link */}
                                        <ListItemButton
                                            component={Link}
                                            href="/profile"
                                            onClick={handleNavClick}
                                            selected={pathname === "/profile"}
                                            sx={{
                                                pl: 7,
                                                py: 1.5,
                                                position: "relative",
                                                "&.Mui-selected": {
                                                    bgcolor: "rgba(39, 174, 96, 0.06)",
                                                    color: tokens.brand,
                                                    "& .MuiListItemIcon-root": {
                                                        color: tokens.brand,
                                                    },
                                                    "&::before": {
                                                        content: '""',
                                                        position: "absolute",
                                                        left: 0,
                                                        top: 0,
                                                        bottom: 0,
                                                        width: 4,
                                                        bgcolor: tokens.brand,
                                                    }
                                                }
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <PersonOutlineOutlinedIcon sx={{ fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={t("profile")}
                                                primaryTypographyProps={{ fontWeight: pathname === "/profile" ? 700 : 500 }}
                                            />
                                        </ListItemButton>

                                        {/* My Addresses Link */}
                                        <ListItemButton
                                            component={Link}
                                            href="/profile/addresses"
                                            onClick={handleNavClick}
                                            selected={pathname === "/profile/addresses"}
                                            sx={{
                                                pl: 7,
                                                py: 1.5,
                                                position: "relative",
                                                "&.Mui-selected": {
                                                    bgcolor: "rgba(39, 174, 96, 0.06)",
                                                    color: tokens.brand,
                                                    "& .MuiListItemIcon-root": {
                                                        color: tokens.brand,
                                                    },
                                                    "&::before": {
                                                        content: '""',
                                                        position: "absolute",
                                                        left: 0,
                                                        top: 0,
                                                        bottom: 0,
                                                        width: 4,
                                                        bgcolor: tokens.brand,
                                                    }
                                                }
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <HomeOutlinedIcon sx={{ fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={tProfile("my_addresses")}
                                                primaryTypographyProps={{ fontWeight: pathname === "/profile/addresses" ? 700 : 500 }}
                                            />
                                        </ListItemButton>

                                        {/* My Orders Link */}
                                        <ListItemButton
                                            component={Link}
                                            href="/profile/orders"
                                            onClick={handleNavClick}
                                            selected={pathname === "/profile/orders"}
                                            sx={{
                                                pl: 7,
                                                py: 1.5,
                                                position: "relative",
                                                "&.Mui-selected": {
                                                    bgcolor: "rgba(39, 174, 96, 0.06)",
                                                    color: tokens.brand,
                                                    "& .MuiListItemIcon-root": {
                                                        color: tokens.brand,
                                                    },
                                                    "&::before": {
                                                        content: '""',
                                                        position: "absolute",
                                                        left: 0,
                                                        top: 0,
                                                        bottom: 0,
                                                        width: 4,
                                                        bgcolor: tokens.brand,
                                                    }
                                                }
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <ReceiptLongOutlinedIcon sx={{ fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={tProfile("orderHistory")}
                                                primaryTypographyProps={{ fontWeight: pathname === "/profile/orders" ? 700 : 500 }}
                                            />
                                        </ListItemButton>
                                        <ListItemButton
                                            onClick={handleLogout}
                                            sx={{
                                                pl: 7,
                                                py: 1.5,
                                                color: "error.main",
                                                "&:hover": {
                                                    bgcolor: "error.lighter",
                                                }
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                                                <LogoutOutlinedIcon sx={{ fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={tAuth("logout")}
                                                primaryTypographyProps={{ fontWeight: 600 }}
                                            />
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
