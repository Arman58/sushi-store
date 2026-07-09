"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useState, useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/server";
import { tokens } from "@/shared/ui/theme";

const languages = [
    { code: "hy", label: "Հայերեն", hint: "Armenian", flag: "🇦🇲" },
    { code: "ru", label: "Русский", hint: "Russian", flag: "🇷🇺" },
    { code: "en", label: "English", hint: "English", flag: "🇬🇧" },
];

export default function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [isPending, startTransition] = useTransition();
    const open = Boolean(anchorEl);

    const handleChange = (newLocale: string) => {
        setAnchorEl(null);
        if (newLocale === locale) return;
        const qs =
            typeof window !== "undefined"
                ? window.location.search.slice(1)
                : searchParams.toString();
        const href = qs ? `${pathname}?${qs}` : pathname;
        startTransition(() => {
            router.replace(href, { locale: newLocale });
        });
    };

    const current = languages.find((l) => l.code === locale) ?? languages[0];

    return (
        <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            <ButtonBase
                onClick={(e) => setAnchorEl(e.currentTarget)}
                aria-label={current.label}
                aria-haspopup="menu"
                aria-expanded={open}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    height: 40,
                    px: { xs: 0.75, sm: 1 },
                    borderRadius: 999,
                    // ghost-стиль: единый ритм с остальными иконками шапки
                    bgcolor: open ? tokens.brandDim : "transparent",
                    color: tokens.textPrimary,
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    opacity: isPending ? 0.6 : 1,
                    transition: "background-color 0.18s ease",
                    "&:hover": { bgcolor: tokens.surfaceHi },
                    "&:active": { transform: "scale(0.96)" },
                }}
            >
                <LanguageRoundedIcon
                    sx={{
                        fontSize: 17,
                        color: tokens.textSecondary,
                        display: { xs: "none", sm: "inline-flex" },
                    }}
                />
                {current.code.toUpperCase()}
                <ExpandMoreRoundedIcon
                    sx={{
                        fontSize: 16,
                        color: tokens.textMuted,
                        transition: "transform 0.2s ease",
                        transform: open ? "rotate(180deg)" : "none",
                    }}
                />
            </ButtonBase>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 1,
                            minWidth: 210,
                            borderRadius: 3,
                            border: `1px solid ${tokens.border}`,
                            boxShadow: "0 12px 32px rgba(var(--ew-text-rgb), 0.14)",
                            p: 0.5,
                        },
                    },
                    list: { sx: { p: 0 } },
                }}
            >
                {languages.map((lang) => {
                    const selected = locale === lang.code;
                    return (
                        <MenuItem
                            key={lang.code}
                            selected={selected}
                            onClick={() => handleChange(lang.code)}
                            sx={{
                                borderRadius: 2,
                                mx: 0.5,
                                my: 0.25,
                                px: 1.25,
                                py: 1,
                                gap: 1.25,
                                "&.Mui-selected": {
                                    bgcolor: tokens.brandDim,
                                    "&:hover": { bgcolor: tokens.brandDim },
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    bgcolor: tokens.surfaceHi,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 17,
                                    flexShrink: 0,
                                }}
                            >
                                {lang.flag}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    variant="body2"
                                    fontWeight={selected ? 800 : 600}
                                    sx={{ lineHeight: 1.2 }}
                                >
                                    {lang.label}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: tokens.textMuted,
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {lang.hint}
                                </Typography>
                            </Box>
                            {selected && (
                                <CheckRoundedIcon
                                    sx={{ fontSize: 18, color: tokens.brand }}
                                />
                            )}
                        </MenuItem>
                    );
                })}
            </Menu>
        </Box>
    );
}
