"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import Link from "next/link";

export type CategoryPillItem = {
  slug: string;
  name: string;
  /** Category image URL when available */
  imageUrl?: string | null;
};

export type CategoryPillsProps = {
  items: CategoryPillItem[];
  activeSlug: string;
  onSelect?: (slug: string) => void;
};

function hrefForSlug(slug: string) {
  return slug === "all" ? "/menu" : `/menu?category=${encodeURIComponent(slug)}`;
}

/** Soft neutral gradients for inactive avatars without a photo (marketplace-style). */
function inactiveGradientForSlug(slug: string): string {
  const presets = [
    "linear-gradient(145deg, #f8f4f2 0%, #ebe5e1 100%)",
    "linear-gradient(145deg, #f1f5f8 0%, #e5eaee 100%)",
    "linear-gradient(145deg, #f4f2f7 0%, #eae7ef 100%)",
    "linear-gradient(145deg, #f2f7f3 0%, #e6ebe8 100%)",
    "linear-gradient(145deg, #f8f5ef 0%, #efeae2 100%)",
    "linear-gradient(145deg, #f5f2f2 0%, #eae6e6 100%)",
  ];
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i)) * 31;
  return presets[Math.abs(h) % presets.length];
}

export function CategoryPills({ items, activeSlug, onSelect }: CategoryPillsProps) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        overflowX: "auto",
        px: 2,
        pb: 1,
        minWidth: 0,
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {items.map((item) => {
        const isActive = item.slug === activeSlug;
        const hasImage = Boolean(item.imageUrl);

        const avatarSx = {
          width: 60,
          height: 60,
          transition: "0.2s",
          fontSize: "1.25rem",
          fontWeight: 700,
          ...(isActive
            ? {
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }
            : hasImage
              ? {
                  bgcolor: "#f5f5f5",
                  color: "text.secondary",
                }
              : {
                  bgcolor: "transparent",
                  background: inactiveGradientForSlug(item.slug),
                  color: "text.secondary",
                }),
        } as const;

        const column = (
          <>
            <Avatar src={item.imageUrl ?? undefined} alt="" sx={avatarSx}>
              {item.name?.charAt(0) ?? "?"}
            </Avatar>
            <Typography
              sx={{
                mt: 1,
                fontSize: "11px",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "text.primary" : "text.secondary",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {item.name}
            </Typography>
          </>
        );

        const columnSx = {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: 70,
          flexShrink: 0,
        } as const;

        if (onSelect) {
          return (
            <ButtonBase
              key={item.slug}
              onClick={() => onSelect(item.slug)}
              sx={columnSx}
            >
              {column}
            </ButtonBase>
          );
        }

        return (
          <ButtonBase
            key={item.slug}
            component={Link}
            href={hrefForSlug(item.slug)}
            sx={columnSx}
          >
            {column}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
