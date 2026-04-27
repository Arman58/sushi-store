"use client";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { memo, useEffect, useState } from "react";

import { tokens } from "@/shared/ui/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductBadge = "hit" | "new" | "spicy" | "discount";

export type ProductCardProps = {
  name: string;
  description?: string | null;
  price: number;
  originalPrice?: number | null;
  weight?: number | null;
  image?: string | null;
  badges?: ProductBadge[];
  onAddToCart: () => void;
  quantity?: number;
  onIncrease?: () => void;
  onDecrease?: () => void;
};

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE_CFG: Record<ProductBadge, { label: string; bg: string }> = {
  hit:      { label: "ХИТ",      bg: tokens.orange },
  new:      { label: "НОВИНКА",  bg: "#3B82F6"     },
  spicy:    { label: "🌶 ОСТРОЕ", bg: tokens.red   },
  discount: { label: "",         bg: tokens.green  },
};

const fmt = new Intl.NumberFormat("ru-RU");

// ─── Global keyframes (injected once) ────────────────────────────────────────

const KEYFRAMES = `
@keyframes pc-cart-pulse {
  0%   { box-shadow: 0 0 0 0    ${tokens.orange}55, 0 12px 32px ${tokens.orangeGlow}; }
  70%  { box-shadow: 0 0 0 10px ${tokens.orange}00, 0 12px 32px ${tokens.orangeGlow}; }
  100% { box-shadow: 0 0 0 0    ${tokens.orange}00, 0 12px 32px ${tokens.orangeGlow}; }
}
@keyframes pc-add-pop {
  0%   { transform: scale(1);    }
  35%  { transform: scale(0.82); }
  65%  { transform: scale(1.22); }
  100% { transform: scale(1);    }
}
@keyframes pc-shimmer {
  0%   { transform: translateX(-130%) skewX(-18deg); opacity: 0;   }
  20%  { opacity: 1;                                                }
  100% { transform: translateX(230%)  skewX(-18deg); opacity: 0.4; }
}
`;

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById("pc-kf-v2")) return;
  const s = document.createElement("style");
  s.id = "pc-kf-v2";
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ProductCard = memo(function ProductCard({
  name,
  description,
  price,
  originalPrice,
  weight,
  image,
  badges = [],
  onAddToCart,
  quantity = 0,
  onIncrease,
  onDecrease,
}: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [addPopped, setAddPopped] = useState(false);

  useEffect(() => { ensureKeyframes(); }, []);

  const hasInCart   = quantity > 0;
  const hasDiscount = typeof originalPrice === "number" && originalPrice > price;
  const discountPct = hasDiscount
    ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
    : 0;

  const allBadges: ProductBadge[] =
    hasDiscount && !badges.includes("discount")
      ? ["discount", ...badges]
      : badges;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart();
    setAddPopped(true);
    setTimeout(() => setAddPopped(false), 450);
  };

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: "20px",
        overflow: "hidden",
        // ── PORTRAIT 4:5 — image is the product ──
        aspectRatio: "4 / 5",
        cursor: "pointer",
        bgcolor: tokens.surfaceHi,
        border: `1px solid ${hasInCart ? tokens.orange + "55" : tokens.border}`,
        transition:
          "transform 0.28s cubic-bezier(.22,.68,0,1.2), box-shadow 0.28s ease, border-color 0.2s ease",
        animation: hasInCart ? "pc-cart-pulse 2.4s ease-in-out infinite" : "none",

        "&:hover": {
          transform: "translateY(-6px) scale(1.015)",
          boxShadow: `0 32px 64px rgba(0,0,0,0.8), 0 0 0 1px ${tokens.borderHi}`,
          "& .pc-img":     { transform: "scale(1.08)" },
          "& .pc-shimmer": { animation: "pc-shimmer 0.75s ease-out forwards" },
          "& .pc-name":    { color: "#FFFFFF" },
        },

        ...(hasInCart && {
          borderColor: tokens.orange + "66",
          boxShadow: `0 0 0 1px ${tokens.orange}44, 0 12px 32px ${tokens.orangeGlow}`,
        }),
      }}
    >
      {/* ── Full-bleed image ───────────────────────────────────────── */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          bgcolor: tokens.surfaceHi,
        }}
      >
        {!imgLoaded && image && (
          <Skeleton
            variant="rectangular"
            sx={{
              position: "absolute",
              inset: 0,
              height: "100%",
              transform: "none",
              bgcolor: tokens.surfaceHi,
            }}
          />
        )}

        {image ? (
          <Image
            className="pc-img"
            src={image}
            alt={name}
            fill
            sizes="(max-width: 600px) 50vw, (max-width: 960px) 33vw, 25vw"
            style={{
              objectFit: "cover",
              transition: "transform 0.5s cubic-bezier(.22,.68,0,1.2)",
            }}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
          />
        ) : (
          /* ── Fallback — premium gradient tile with large emoji ── */
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // Richer gradient — more visual depth even without a photo
              background: `
                radial-gradient(ellipse 80% 60% at 50% 35%, ${tokens.orange}18 0%, transparent 65%),
                linear-gradient(160deg, ${tokens.surfaceHi} 0%, ${tokens.surfaceUp} 50%, #1A1A1A 100%)
              `,
              userSelect: "none",
              // Subtle inner glow
              boxShadow: `inset 0 0 60px rgba(255,107,0,0.06)`,
            }}
          >
            {/* Large emoji — the only visual when no photo */}
            <Typography
              sx={{
                fontSize: { xs: 68, sm: 80 },
                lineHeight: 1,
                filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))",
                transform: "translateY(-8%)",
                transition: "transform 0.45s cubic-bezier(.22,.68,0,1.2)",
                ".pc-img-wrap:hover &": { transform: "translateY(-14%) scale(1.08)" },
              }}
            >
              🍱
            </Typography>
          </Box>
        )}

        {/* Hover shimmer sweep */}
        <Box
          className="pc-shimmer"
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
            transform: "translateX(-130%) skewX(-18deg)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      </Box>

      {/* ── Bottom cinematic scrim ─────────────────────────────────── */}
      {/*
        This scrim MUST be opaque enough to guarantee white text legibility
        regardless of whether the card has a real photo or the emoji fallback.
        Even on a dark (#141414) background, a hard scrim at bottom gives
        clear visual separation between the image zone and the text zone.
      */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          // Taller scrim — text area is always well-covered
          height: "72%",
          background:
            "linear-gradient(to top, rgba(5,5,5,1) 0%, rgba(5,5,5,0.92) 22%, rgba(5,5,5,0.72) 42%, rgba(5,5,5,0.35) 62%, rgba(5,5,5,0.08) 80%, transparent 100%)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* ── TOP-LEFT: badge pills ──────────────────────────────────── */}
      {allBadges.length > 0 && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ position: "absolute", top: 12, left: 12, zIndex: 5 }}
        >
          {allBadges.slice(0, 2).map((badge) => {
            const cfg = BADGE_CFG[badge];
            return (
              <Box
                key={badge}
                sx={{
                  px: 1.1,
                  py: 0.4,
                  borderRadius: "8px",
                  bgcolor: cfg.bg,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: 0.9,
                  lineHeight: 1.6,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
                }}
              >
                {badge === "discount" && discountPct > 0
                  ? `-${discountPct}%`
                  : cfg.label}
              </Box>
            );
          })}
        </Stack>
      )}

      {/* ── TOP-RIGHT: quantity bubble ─────────────────────────────── */}
      {hasInCart && (
        <Box
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 5,
            minWidth: 26,
            height: 26,
            px: 0.75,
            borderRadius: 999,
            bgcolor: tokens.orange,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 900,
            boxShadow: `0 2px 12px ${tokens.orangeGlow}`,
          }}
        >
          {quantity}
        </Box>
      )}

      {/* ── BOTTOM OVERLAY: name + price + CTA ───────────────────── */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 4,
          px: { xs: 1.5, sm: 1.75 },
          pb: { xs: 1.5, sm: 1.75 },
          display: "flex",
          flexDirection: "column",
          gap: 0.6,
        }}
      >
        {/* Weight micro-label */}
        {weight && weight > 0 && (
          <Typography
            sx={{
              color: tokens.textMuted,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.4,
              lineHeight: 1,
            }}
          >
            {weight}&thinsp;г
          </Typography>
        )}

        {/* Product name — bold, overlaid */}
        <Typography
          className="pc-name"
          fontWeight={800}
          sx={{
            lineHeight: 1.2,
            fontSize: { xs: 13, sm: 14 },
            color: "rgba(255,255,255,0.88)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            transition: "color 0.2s ease",
          }}
        >
          {name}
        </Typography>

        {/* Price + CTA row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 1,
            mt: 0.4,
          }}
        >
          {/* ── Price ── */}
          <Box>
            <Typography
              component="span"
              sx={{
                display: "block",
                fontWeight: 900,
                fontSize: { xs: "1.2rem", sm: "1.35rem" },
                lineHeight: 1,
                color: tokens.orange,
                letterSpacing: -0.5,
                textShadow: `0 0 20px ${tokens.orangeGlow}`,
              }}
            >
              {fmt.format(price)}&thinsp;֏
            </Typography>
            {hasDiscount && (
              <Typography
                component="span"
                sx={{
                  display: "block",
                  fontSize: 10,
                  fontWeight: 500,
                  color: tokens.textMuted,
                  textDecoration: "line-through",
                  lineHeight: 1.4,
                  mt: 0.15,
                }}
              >
                {fmt.format(originalPrice!)}&thinsp;֏
              </Typography>
            )}
          </Box>

          {/* ── CTA: Add or Stepper ── */}
          {hasInCart ? (
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.4}
              sx={{
                bgcolor: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderRadius: 999,
                px: 0.5,
                py: 0.4,
                border: `1px solid ${tokens.orange}55`,
                flexShrink: 0,
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onDecrease?.(); }}
                sx={{
                  width: 28,
                  height: 28,
                  color: tokens.textSecondary,
                  transition: "color 0.15s ease",
                  "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.07)" },
                  "&:active": { transform: "scale(0.85)" },
                }}
              >
                <RemoveIcon sx={{ fontSize: 14 }} />
              </IconButton>

              <Typography
                fontWeight={900}
                sx={{
                  minWidth: 20,
                  textAlign: "center",
                  color: "#fff",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                {quantity}
              </Typography>

              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onIncrease?.(); }}
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: tokens.orange,
                  color: "#fff",
                  borderRadius: "50%",
                  flexShrink: 0,
                  transition: "background 0.15s ease",
                  "&:hover": { bgcolor: tokens.orangeHi },
                  "&:active": { transform: "scale(0.85)" },
                }}
              >
                <AddIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Stack>
          ) : (
            <IconButton
              size="small"
              onClick={handleAdd}
              aria-label={`Добавить ${name}`}
              sx={{
                width: 42,
                height: 42,
                bgcolor: tokens.orange,
                color: "#fff",
                borderRadius: "50%",
                flexShrink: 0,
                animation: addPopped
                  ? "pc-add-pop 0.45s cubic-bezier(.22,.68,0,1.2) forwards"
                  : "none",
                boxShadow: `0 4px 20px ${tokens.orangeGlow}`,
                transition: "background 0.18s ease, box-shadow 0.18s ease",
                "&:hover": {
                  bgcolor: tokens.orangeHi,
                  boxShadow: `0 6px 28px ${tokens.orangeGlow}`,
                },
                "&:active": { transform: "scale(0.85)" },
              }}
            >
              <AddIcon sx={{ fontSize: 22 }} />
            </IconButton>
          )}
        </Box>
      </Box>
    </Box>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ProductCardSkeleton() {
  return (
    <Box
      sx={{
        borderRadius: "20px",
        overflow: "hidden",
        aspectRatio: "4 / 5",
        bgcolor: tokens.surface,
        border: `1px solid ${tokens.border}`,
        position: "relative",
      }}
    >
      <Skeleton
        variant="rectangular"
        sx={{
          position: "absolute",
          inset: 0,
          height: "100%",
          transform: "none",
          bgcolor: tokens.surfaceHi,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "45%",
          background:
            "linear-gradient(to top, rgba(8,8,8,0.9) 0%, transparent 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          px: 1.75,
          pb: 1.75,
          gap: 0.75,
        }}
      >
        <Skeleton
          variant="text"
          width="72%"
          sx={{ bgcolor: "rgba(255,255,255,0.07)", borderRadius: 1 }}
        />
        <Skeleton
          variant="text"
          width="40%"
          sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: 1 }}
        />
      </Box>
    </Box>
  );
}
