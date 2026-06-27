"use client";

import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/server";
import type { StorefrontCategory } from "@/lib/i18n-utils";

export type CategoryPillsMode = "link" | "interactive";

export type CategoryPillsListProps = {
    categories: StorefrontCategory[];
    activeSlug?: string;
    mode?: CategoryPillsMode;
    onChange?: (slug: string) => void;
};

function hrefForSlug(slug: string) {
    if (slug === "all") return "/menu";
    return `/menu?category=${encodeURIComponent(slug)}`;
}

function isAllSlug(slug?: string) {
    return !slug || slug === "all";
}

function pillChipSx(isActive: boolean) {
    return {
        flexShrink: 0,
        height: 40,
        fontWeight: isActive ? 700 : 500,
        borderColor: isActive ? "primary.main" : "divider",
        "& .MuiChip-label": {
            whiteSpace: "nowrap",
            px: 1,
        },
    } as const;
}

function pillAvatarSx(isActive: boolean) {
    return {
        bgcolor: isActive ? "primary.dark" : "grey.100",
        color: isActive ? "primary.contrastText" : "text.secondary",
        fontSize: "0.75rem",
        fontWeight: 700,
    } as const;
}

export function CategoryPillsList({
    categories,
    activeSlug,
    mode = "link",
    onChange,
}: CategoryPillsListProps) {
    const t = useTranslations("menu");

    const handleSelect = (slug: string) => {
        if (mode !== "interactive" || !onChange) return;

        if (slug === "all") {
            onChange("all");
            return;
        }

        onChange(isAllSlug(activeSlug) || activeSlug !== slug ? slug : "all");
    };

    const pills: { slug: string; name: string }[] = [
        { slug: "all", name: t("all_categories") },
        ...categories.map((category) => ({
            slug: category.slug,
            name: category.name,
        })),
    ];

    return (
        <Stack
            direction="row"
            spacing={1}
            sx={{
                overflowX: "auto",
                whiteSpace: "nowrap",
                scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch",
                scrollBehavior: "smooth",
                flexWrap: "nowrap",
                py: 0.5,
                mx: { xs: -2, md: 0 },
                px: { xs: 2, md: 0 },
                justifyContent: { xs: "flex-start", md: "center" },
                "&::-webkit-scrollbar": { display: "none" },
            }}
        >
            {pills.map((pill) => {
                const isActive =
                    pill.slug === "all"
                        ? isAllSlug(activeSlug)
                        : activeSlug === pill.slug;

                const chipProps = {
                    clickable: true as const,
                    label: pill.name,
                    avatar: (
                        <Avatar alt="" sx={pillAvatarSx(isActive)}>
                            {pill.name.charAt(0)}
                        </Avatar>
                    ),
                    variant: (isActive ? "filled" : "outlined") as
                        | "filled"
                        | "outlined",
                    color: (isActive ? "primary" : "default") as
                        | "primary"
                        | "default",
                    sx: pillChipSx(isActive),
                };

                if (mode === "interactive") {
                    return (
                        <Chip
                            key={pill.slug}
                            {...chipProps}
                            onClick={() => handleSelect(pill.slug)}
                        />
                    );
                }

                return (
                    <Chip
                        key={pill.slug}
                        {...chipProps}
                        component={Link}
                        href={hrefForSlug(pill.slug)}
                    />
                );
            })}
        </Stack>
    );
}
