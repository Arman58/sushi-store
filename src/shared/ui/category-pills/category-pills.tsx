"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import Link from "next/link";

const PRIMARY = "#E85D4A";
const PILL_BORDER = "#f0f0f0";

export type CategoryPillItem = { slug: string; name: string };

export type CategoryPillsProps = {
  items: CategoryPillItem[];
  activeSlug: string;
  onSelect?: (slug: string) => void;
};

function hrefForSlug(slug: string) {
  return slug === "all" ? "/menu" : `/menu?category=${encodeURIComponent(slug)}`;
}

export function CategoryPills({ items, activeSlug, onSelect }: CategoryPillsProps) {
  return (
    <Box
      sx={{
        overflowX: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          gap: 1,
          pb: 0.5,
          minWidth: "max-content",
        }}
      >
        {items.map((item) => {
          const isActive = item.slug === activeSlug;
          const baseSx = {
            px: 1.75,
            py: 0.9,
            borderRadius: "12px",
            border: `1px solid ${PILL_BORDER}`,
            transition:
              "background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease",
            ...(isActive
              ? {
                  bgcolor: "rgba(232, 93, 74, 0.1)",
                  borderColor: "rgba(232, 93, 74, 0.25)",
                }
              : {
                  bgcolor: "#fff",
                  color: "text.secondary",
                  borderColor: PILL_BORDER,
                  "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                }),
          } as const;

          if (onSelect) {
            return (
              <ButtonBase
                key={item.slug}
                onClick={() => onSelect(item.slug)}
                sx={baseSx}
              >
                <Typography
                  fontWeight={isActive ? 700 : 500}
                  sx={{
                    fontSize: 14,
                    color: isActive ? PRIMARY : "text.secondary",
                    lineHeight: 1.2,
                  }}
                >
                  {item.name}
                </Typography>
              </ButtonBase>
            );
          }

          return (
            <ButtonBase
              key={item.slug}
              component={Link}
              href={hrefForSlug(item.slug)}
              sx={baseSx}
            >
              <Typography
                fontWeight={isActive ? 700 : 500}
                sx={{
                  fontSize: 14,
                  color: isActive ? PRIMARY : "text.secondary",
                  lineHeight: 1.2,
                }}
              >
                {item.name}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
