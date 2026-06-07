"use client";

import DiscountIcon from "@mui/icons-material/Discount";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import StorefrontIcon from "@mui/icons-material/Storefront";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { alpha } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const DRAWER_WIDTH = 260;

const NAV_ITEMS = [
    {
        href: "/admin/orders",
        label: "Заказы",
        icon: ListAltIcon,
    },
    {
        href: "/admin/products",
        label: "Товары",
        icon: StorefrontIcon,
    },
    {
        href: "/admin/delivery-zones",
        label: "Зоны доставки",
        icon: LocalShippingIcon,
    },
    {
        href: "/admin/promocodes",
        label: "Промокоды",
        icon: DiscountIcon,
    },
] as const;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();

    return (
        <List sx={{ flex: 1, px: 1, py: 1 }}>
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active =
                    pathname === href || pathname.startsWith(`${href}/`);
                return (
                    <ListItemButton
                        key={href}
                        component={Link}
                        href={href}
                        selected={active}
                        onClick={onNavigate}
                        sx={(theme) => ({
                            borderRadius: 2,
                            mb: 0.5,
                            color: "grey.400",
                            "&.Mui-selected": {
                                bgcolor: alpha(
                                    theme.palette.primary.main,
                                    0.08,
                                ),
                                color: "primary.main",
                                "&:hover": {
                                    bgcolor: alpha(
                                        theme.palette.primary.main,
                                        0.12,
                                    ),
                                },
                                "& .MuiListItemIcon-root": {
                                    color: "primary.main",
                                },
                                "& .MuiListItemText-primary": {
                                    color: "primary.main",
                                    fontWeight: 700,
                                },
                            },
                            "&:hover": {
                                bgcolor: alpha(
                                    theme.palette.primary.main,
                                    0.06,
                                ),
                            },
                        })}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 40,
                                color: active ? "primary.main" : "grey.500",
                            }}
                        >
                            <Icon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                            primary={label}
                            primaryTypographyProps={{
                                fontWeight: active ? 700 : 500,
                                fontSize: 14,
                            }}
                        />
                    </ListItemButton>
                );
            })}
        </List>
    );
}

function SidebarBrand() {
    return (
        <Box
            sx={{
                px: 2,
                py: 2,
                display: "flex",
                alignItems: "center",
                gap: 1.25,
            }}
        >
            <Box
                sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    overflow: "hidden",
                    position: "relative",
                    flexShrink: 0,
                    bgcolor: "background.paper",
                }}
            >
                <Image
                    src="/east-west-logo.png"
                    alt="East West"
                    fill
                    sizes="36px"
                    style={{ objectFit: "cover" }}
                />
            </Box>
            <Box>
                <Typography variant="subtitle2" fontWeight={800} lineHeight={1.1}>
                    East West
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Admin
                </Typography>
            </Box>
        </Box>
    );
}

function LogoutButton() {
    return (
        <Box sx={{ p: 1.5 }}>
            <form action="/api/admin/logout" method="POST">
                <Button
                    type="submit"
                    fullWidth
                    startIcon={<LogoutOutlinedIcon fontSize="small" />}
                    sx={{
                        justifyContent: "flex-start",
                        pl: 2,
                        py: 1.25,
                        borderRadius: 2,
                        color: "error.light",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: 14,
                        "&:hover": {
                            bgcolor: "error.dark",
                            color: "error.contrastText",
                        },
                    }}
                >
                    Выйти
                </Button>
            </form>
        </Box>
    );
}

function DrawerPaperContent({ onNavigate }: { onNavigate?: () => void }) {
    return (
        <Box
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: "grey.900",
                color: "grey.100",
            }}
        >
            <SidebarBrand />
            <Divider sx={{ borderColor: "grey.800" }} />
            <Box sx={{ flex: 1, overflow: "auto" }}>
                <SidebarNav onNavigate={onNavigate} />
            </Box>
            <Divider sx={{ borderColor: "grey.800" }} />
            <LogoutButton />
        </Box>
    );
}

type AdminShellProps = {
    children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <Box
            sx={{
                display: "flex",
                minHeight: "100vh",
                bgcolor: "background.default",
            }}
        >
            <Box
                component="nav"
                sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: "block", md: "none" },
                        "& .MuiDrawer-paper": {
                            width: DRAWER_WIDTH,
                            boxSizing: "border-box",
                            border: "none",
                        },
                    }}
                >
                    <DrawerPaperContent
                        onNavigate={() => setMobileOpen(false)}
                    />
                </Drawer>

                <Drawer
                    variant="permanent"
                    open
                    sx={{
                        display: { xs: "none", md: "block" },
                        "& .MuiDrawer-paper": {
                            width: DRAWER_WIDTH,
                            boxSizing: "border-box",
                            border: "none",
                        },
                    }}
                >
                    <DrawerPaperContent />
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    minHeight: "100vh",
                }}
            >
                <Toolbar
                    sx={{
                        display: { md: "none" },
                        px: 2,
                        borderBottom: 1,
                        borderColor: "divider",
                        bgcolor: "background.paper",
                    }}
                >
                    <IconButton
                        edge="start"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Открыть меню"
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ ml: 1 }}>
                        Админка
                    </Typography>
                </Toolbar>

                <Box
                    sx={{
                        p: { xs: 2, sm: 3 },
                        bgcolor: "background.paper",
                        minHeight: { md: "100vh" },
                    }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    );
}
