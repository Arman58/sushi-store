"use client";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import type { ProductBadge } from "@/entities/product/ui/product-card";
import { ProductCard } from "@/entities/product/ui/product-card";
import { useCartStore } from "@/features/cart";
import { tokens } from "@/shared/ui/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PopularProduct = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  weight?: number | null;
  images?: any;
  category?: { name: string } | null;
  composition?: string | null;
};

type Props = {
  products: PopularProduct[];
  title?: string;
  badge?: ProductBadge;
  seeAllHref?: string;
};

// ─── Cinematic section header ─────────────────────────────────────────────────

function SectionHeader({
  title,
  seeAllHref,
}: {
  title: string;
  seeAllHref?: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mb: { xs: 2.5, sm: 3 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {/* Orange accent bar */}
        <Box
          sx={{
            width: 4,
            height: { xs: 22, sm: 28 },
            borderRadius: 999,
            background: `linear-gradient(180deg, ${tokens.orange} 0%, ${tokens.red} 100%)`,
            boxShadow: `0 2px 12px ${tokens.orangeGlow}`,
            flexShrink: 0,
          }}
        />
        <Typography
          variant="h5"
          fontWeight={900}
          sx={{
            letterSpacing: -0.5,
            fontSize: { xs: "1.2rem", sm: "1.4rem" },
            lineHeight: 1.1,
            color: tokens.textPrimary,
          }}
        >
          {title}
        </Typography>
      </Box>

      {seeAllHref && (
        <ButtonBase
          component={Link}
          href={seeAllHref}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1.5,
            py: 0.75,
            borderRadius: "10px",
            border: `1px solid ${tokens.border}`,
            bgcolor: "transparent",
            color: tokens.orange,
            transition: "all 0.18s ease",
            "&:hover": {
              bgcolor: tokens.orangeDim,
              borderColor: tokens.orange + "44",
              gap: 0.9,
            },
            "&:active": { transform: "scale(0.95)" },
          }}
        >
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ color: "inherit", fontSize: 12, letterSpacing: 0.2 }}
          >
            Все
          </Typography>
          <ArrowForwardIcon sx={{ fontSize: 13, color: "inherit" }} />
        </ButtonBase>
      )}
    </Box>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PopularSection({
  products,
  title = "Популярное",
  badge,
  seeAllHref = "/menu",
}: Props) {
  const addItem    = useCartStore((s) => s.addItem);
  const setItemQty = useCartStore((s) => s.setItemQuantity);
  const cartItems  = useCartStore((s) => s.items);

  const handleAdd = (p: PopularProduct) => {
    const thumb =
      Array.isArray(p.images) && typeof p.images[0] === "string"
        ? p.images[0]
        : undefined;
    addItem({ productId: p.id, name: p.name, price: p.price, image: thumb });
  };

  if (products.length === 0) return null;

  return (
    <Box component="section">
      <SectionHeader title={title} seeAllHref={seeAllHref} />

      <Box
        sx={{
          display: "grid",
          gap: { xs: 1.5, sm: 2, md: 2.5 },
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(4, 1fr)",
          },
        }}
      >
        {products.map((product) => {
          const qty =
            cartItems.find((i) => i.productId === product.id)?.quantity ?? 0;

          return (
            <ProductCard
              key={product.id}
              name={product.name}
              description={product.description}
              categoryName={product.category?.name}
              composition={product.composition ?? undefined}
              price={product.price}
              weight={product.weight}
              images={product.images}
              badges={badge ? [badge] : []}
              quantity={qty}
              onAddToCart={() => handleAdd(product)}
              onIncrease={() => setItemQty(product.id, qty + 1)}
              onDecrease={() => setItemQty(product.id, qty - 1)}
            />
          );
        })}
      </Box>
    </Box>
  );
}
