"use client";

import Box from "@mui/material/Box";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { CategoryPills } from "@/shared/ui/category-pills";
import { tokens } from "@/shared/ui/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Category = { id: number; name: string; slug: string };

type Props = { categories: Category[]; activeSlug?: string };

// ─── Component ────────────────────────────────────────────────────────────────

export function CategoryScroll({ categories, activeSlug: activeSlugProp }: Props) {
  const t = useTranslations("menu");
  const searchParams = useSearchParams();

  const validSlugs = useMemo(
    () => new Set(["all", ...categories.map((c) => c.slug)]),
    [categories],
  );

  const categoryFromUrl = searchParams.get("category");
  const activeSlug =
    categoryFromUrl && validSlugs.has(categoryFromUrl)
      ? categoryFromUrl
      : (activeSlugProp ?? "all");
  const items = [
    { slug: "all", name: t("categoryAll") },
    ...categories.map((c) => ({ slug: c.slug, name: c.name })),
  ];

  return (
    <Box
      sx={{
        position: "relative",
        "&::before, &::after": {
          content: '""',
          position: "absolute",
          top: 0,
          bottom: 0,
          width: { xs: 24, sm: 0 },
          zIndex: 2,
          pointerEvents: "none",
        },
        "&::before": {
          left: 0,
          background: `linear-gradient(to right, ${tokens.bg}, transparent)`,
        },
        "&::after": {
          right: 0,
          background: `linear-gradient(to left, ${tokens.bg}, transparent)`,
        },
      }}
    >
      <Box
        sx={{
          mx: { xs: -2, sm: -3, md: 0 },
          px: { xs: 2, sm: 3, md: 0 },
        }}
      >
        <CategoryPills
          items={items}
          activeSlug={activeSlug}
        />
      </Box>
    </Box>
  );
}
