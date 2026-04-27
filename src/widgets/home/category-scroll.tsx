"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { tokens } from "@/shared/ui/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Category = { id: number; name: string; slug: string };

type Props = { categories: Category[]; activeSlug?: string };

// ─── Emoji map ────────────────────────────────────────────────────────────────

const EMOJI_MAP: Record<string, string> = {
  sushi:    "🍣",
  rolls:    "🍱",
  pizza:    "🍕",
  shawarma: "🌯",
  snacks:   "🍟",
  salads:   "🥗",
  drinks:   "🥤",
  desserts: "🍮",
  sets:     "🎁",
  lahmajo:  "🫓",
  strips:   "🍗",
  soup:     "🍜",
};

function getEmoji(slug: string): string {
  const lower = slug.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return "🍽";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CategoryScroll({ categories, activeSlug }: Props) {
  const all = [{ id: 0, name: "Все", slug: "all" }, ...categories];

  return (
    <Box
      sx={{
        position: "relative",
        // Fade edges for premium overflow feel
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
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          // Bleed to screen edge on mobile
          mx: { xs: -2, sm: -3, md: 0 },
          px: { xs: 2, sm: 3, md: 0 },
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            gap: { xs: 1, sm: 1.25 },
            pb: 0.5,
            minWidth: "max-content",
          }}
        >
          {all.map((cat) => {
            const isActive = cat.slug === (activeSlug ?? "all");
            const emoji    = getEmoji(cat.slug);

            return (
              <ButtonBase
                key={cat.id}
                component={Link}
                href={cat.slug === "all" ? "/menu" : `/menu?category=${cat.slug}`}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.6,
                  px: { xs: 1.75, sm: 2.25 },
                  py: { xs: 1.5, sm: 1.75 },
                  minWidth: { xs: 68, sm: 78 },
                  borderRadius: "16px",

                  // Active state: warm glow + orange border
                  border: `1px solid ${isActive ? tokens.orange : tokens.border}`,
                  bgcolor: isActive ? tokens.orangeDim : tokens.surfaceUp,
                  boxShadow: isActive
                    ? `0 0 0 1px ${tokens.orange}33, 0 4px 16px ${tokens.orangeGlow}`
                    : "none",

                  transition: "all 0.2s cubic-bezier(.22,.68,0,1.2)",

                  "&:hover": {
                    bgcolor: isActive ? tokens.orangeDim : tokens.surfaceHi,
                    borderColor: isActive ? tokens.orange : tokens.borderHi,
                    transform: "translateY(-2px)",
                    boxShadow: isActive
                      ? `0 0 0 1px ${tokens.orange}55, 0 8px 24px ${tokens.orangeGlow}`
                      : `0 4px 16px rgba(0,0,0,0.4)`,
                  },
                  "&:active": { transform: "scale(0.94)" },
                }}
              >
                {/* Emoji */}
                <Typography
                  sx={{
                    fontSize: { xs: 24, sm: 28 },
                    lineHeight: 1,
                    filter: isActive
                      ? "drop-shadow(0 2px 8px rgba(255,107,0,0.5))"
                      : "none",
                    transition: "filter 0.2s ease",
                  }}
                >
                  {emoji}
                </Typography>

                {/* Label */}
                <Typography
                  variant="caption"
                  fontWeight={isActive ? 800 : 500}
                  noWrap
                  sx={{
                    color: isActive ? tokens.orange : tokens.textSecondary,
                    fontSize: { xs: 10, sm: 11 },
                    maxWidth: 66,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    transition: "color 0.2s ease",
                    letterSpacing: isActive ? 0.2 : 0,
                  }}
                >
                  {cat.name}
                </Typography>

                {/* Active dot indicator */}
                {isActive && (
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      bgcolor: tokens.orange,
                      mt: -0.3,
                      boxShadow: `0 0 6px ${tokens.orange}`,
                    }}
                  />
                )}
              </ButtonBase>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
