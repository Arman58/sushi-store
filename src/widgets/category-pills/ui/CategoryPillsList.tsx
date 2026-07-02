"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/server";
import type { StorefrontCategory } from "@/lib/i18n-utils";
import { tokens } from "@/shared/ui/theme";

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

/** Map common category slugs/names to emoji icons (fallback if no photo) */
const CATEGORY_ICONS: Record<string, string> = {
    all: "🍽️",
    rolls: "🍣",
    sushi: "🍣",
    rolly: "🍣",
    pizza: "🍕",
    pizzy: "🍕",
    shawarma: "🌯",
    shaurma: "🌯",
    strips: "🍗",
    chicken: "🍗",
    lahmajo: "🫓",
    salads: "🥗",
    salad: "🥗",
    desserts: "🍰",
    dessert: "🍰",
    drinks: "🥤",
    drink: "🥤",
    beverages: "🥤",
    napitki: "🥤",
    sets: "🍱",
    nabory: "🍱",
    hot: "🔥",
    goryachee: "🔥",
    soups: "🍲",
    supy: "🍲",
    snacks: "🧆",
    zakuski: "🧆",
    sauces: "🫙",
    sousy: "🫙",
    add_ons: "➕",
    addons: "➕",
    dopolnitelno: "➕",
};

function getCategoryIcon(slug: string, name: string): string {
    const slugLower = slug.toLowerCase();
    const nameLower = name.toLowerCase();

    // Check slug first
    if (CATEGORY_ICONS[slugLower]) return CATEGORY_ICONS[slugLower];

    // Check if name contains known keywords
    for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
        if (key !== "all" && nameLower.includes(key)) return icon;
    }

    // Armenian transliteration fallbacks
    if (nameLower.includes("ռոլ") || nameLower.includes("սուշի")) return "🍣";
    if (nameLower.includes("պիցցա")) return "🍕";
    if (nameLower.includes("շաուրմա")) return "🌯";
    if (nameLower.includes("աղամջո")) return "🫓";
    if (nameLower.includes("սալատ") || nameLower.includes("ճաշած")) return "🥗";
    if (nameLower.includes(" десерт") || nameLower.includes("քաղց")) return "🍰";
    if (nameLower.includes("խմբ") || nameLower.includes("նախադաս")) return "🍱";
    if (nameLower.includes("ըմպ") || nameLower.includes("խմբար")) return "🍲";
    if (nameLower.includes("սոուս")) return "🫙";
    if (nameLower.includes("խմբարկ")) return "🧆";

    return "🍽️";
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

    const pills: {
        slug: string;
        name: string;
        icon: string;
        image?: string | null;
    }[] = [
        { slug: "all", name: t("all_categories"), icon: "🍽️", image: null },
        ...categories.map((category) => ({
            slug: category.slug,
            name: category.name,
            icon: getCategoryIcon(category.slug, category.name),
            image: category.image ?? null,
        })),
    ];

    return (
        <Stack
            direction="row"
            spacing={1.5}
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
                justifyContent: "flex-start",
                "&::-webkit-scrollbar": { display: "none" },
            }}
        >
            {pills.map((pill) => {
                const isActive =
                    pill.slug === "all"
                        ? isAllSlug(activeSlug)
                        : activeSlug === pill.slug;

                const pillContent = (
                    <Box
                        onClick={
                            mode === "interactive"
                                ? () => handleSelect(pill.slug)
                                : undefined
                        }
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            width: { xs: 108, sm: 124 },
                            flexShrink: 0,
                            borderRadius: "12px",
                            overflow: "hidden",
                            border: "1.5px solid",
                            borderColor: isActive ? tokens.brand : tokens.border,
                            bgcolor: isActive ? tokens.brandDim : "#FFFFFF",
                            cursor: "pointer",
                            transition:
                                "border-color 0.2s, background-color 0.2s, transform 0.15s, box-shadow 0.2s",
                            "&:hover": {
                                borderColor: isActive
                                    ? tokens.brand
                                    : tokens.borderHi,
                                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                                transform: "translateY(-1px)",
                            },
                            "&:active": {
                                transform: "scale(0.97)",
                            },
                        }}
                    >
                        {/* Photo (or emoji fallback) */}
                        <Box
                            sx={{
                                position: "relative",
                                width: "100%",
                                aspectRatio: "16 / 10",
                                bgcolor: tokens.surfaceHi,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                            }}
                        >
                            {pill.image ? (
                                <Image
                                    src={pill.image}
                                    alt={pill.name}
                                    fill
                                    sizes="(max-width: 600px) 108px, 124px"
                                    style={{ objectFit: "cover" }}
                                />
                            ) : (
                                <Box
                                    component="span"
                                    sx={{ fontSize: 30, lineHeight: 1 }}
                                >
                                    {pill.icon}
                                </Box>
                            )}
                        </Box>

                        <Typography
                            sx={{
                                fontSize: "0.8125rem",
                                fontWeight: isActive ? 700 : 600,
                                color: tokens.textPrimary,
                                lineHeight: 1.2,
                                textAlign: "center",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                px: 1,
                                py: 1,
                            }}
                        >
                            {pill.name}
                        </Typography>
                    </Box>
                );

                if (mode === "link") {
                    return (
                        <Box
                            key={pill.slug}
                            component={Link}
                            href={hrefForSlug(pill.slug)}
                            sx={{ textDecoration: "none", color: "inherit" }}
                        >
                            {pillContent}
                        </Box>
                    );
                }

                return <Box key={pill.slug}>{pillContent}</Box>;
            })}
        </Stack>
    );
}
