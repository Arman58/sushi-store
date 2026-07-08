"use client";

import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import type { SvgIconProps } from "@mui/material";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { Link, usePathname } from "@/i18n/server";
import { tokens } from "@/shared/ui/theme";

type TabKey = "profile" | "addresses" | "orders";

type TabItem = {
    key: TabKey;
    label: string;
    href: string;
    icon: React.ComponentType<SvgIconProps>;
};

export function ProfileTabs({
    labels,
}: {
    labels: Record<TabKey, string>;
}) {
    const pathname = usePathname();

    const items: TabItem[] = [
        { key: "profile", label: labels.profile, href: "/profile", icon: PersonOutlineOutlinedIcon },
        { key: "addresses", label: labels.addresses, href: "/profile/addresses", icon: HomeOutlinedIcon },
        { key: "orders", label: labels.orders, href: "/profile/orders", icon: ReceiptLongOutlinedIcon },
    ];

    return (
        <Box
            sx={{
                display: "flex",
                borderBottom: "1px solid",
                borderColor: "divider",
                mb: 3,
                overflowX: "auto",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": {
                    display: "none",
                },
            }}
        >
            <Stack direction="row" spacing={1} sx={{ minWidth: "100%", pb: 0.5 }}>
                {items.map(({ key, label, href, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <Box
                            key={key}
                            component={Link}
                            href={href}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                px: 2,
                                py: 1.5,
                                textDecoration: "none",
                                color: isActive ? tokens.brand : "text.secondary",
                                borderBottom: "2px solid",
                                borderBottomColor: isActive ? tokens.brand : "transparent",
                                fontWeight: isActive ? 700 : 500,
                                fontSize: "0.95rem",
                                whiteSpace: "nowrap",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    color: isActive ? tokens.brand : "text.primary",
                                },
                            }}
                        >
                            <Icon sx={{ fontSize: 20 }} />
                            <Typography component="span" variant="body2" sx={{ fontWeight: "inherit", color: "inherit" }}>
                                {label}
                            </Typography>
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
}
