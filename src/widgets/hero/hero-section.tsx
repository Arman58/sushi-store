"use client";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BoltIcon from "@mui/icons-material/Bolt";
import DeliveryDiningIcon from "@mui/icons-material/DeliveryDining";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/server";
import { cloudinaryImageLoader } from "@/shared/lib/cloudinary-loader";
import { tokens } from "@/shared/ui/theme";

export type HeroSectionProps = {
  deliveryStat: string;
  openingHoursStat: string;
};

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80";

export function HeroSection({ deliveryStat, openingHoursStat }: HeroSectionProps) {
  const t = useTranslations("hero");

  const stats = [
    { icon: <DeliveryDiningIcon sx={{ fontSize: 16 }} />, text: deliveryStat },
    { icon: <AccessTimeIcon sx={{ fontSize: 16 }} />, text: openingHoursStat },
  ];

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: { xs: 0, sm: "16px" },
        overflow: "hidden",
        minHeight: { xs: 320, sm: 400, md: 460 },
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.05fr) minmax(0, 0.95fr)" },
        bgcolor: tokens.surfaceHi,
      }}
    >
      {/* Mobile: full-bleed image behind text. Desktop: right column only. */}
      <Box
        sx={{
          position: { xs: "absolute", md: "relative" },
          inset: { xs: 0, md: "auto" },
          gridColumn: { md: "2" },
          gridRow: { md: "1" },
          minHeight: { md: "100%" },
          overflow: "hidden",
        }}
      >
        <Image
          loader={cloudinaryImageLoader}
          src={HERO_IMAGE}
          alt="Sushi sets"
          fill
          sizes="(max-width: 900px) 100vw, 48vw"
          style={{ objectFit: "cover" }}
          // eager + fetchPriority вместо priority: кастомный loader + preload
          // даёт «preloaded but not used» в Chrome
          loading="eager"
          fetchPriority="high"
        />
        {/* Mobile dark scrim only */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: { xs: "block", md: "none" },
            background:
              "linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)",
          }}
        />
      </Box>

      {/* Text column — solid surface on desktop, no bleed into photo */}
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          gridColumn: { md: "1" },
          gridRow: { md: "1" },
          px: { xs: 3, sm: 5, md: 6, lg: 8 },
          py: { xs: 4, sm: 8, md: 8 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minWidth: 0,
          bgcolor: { xs: "transparent", md: tokens.surfaceHi },
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 1.75,
            py: 0.75,
            mb: 2.5,
            borderRadius: "999px",
            bgcolor: { xs: "rgba(255,255,255,0.92)", md: tokens.brandDim },
            border: `1px solid ${tokens.brandGlow}`,
            color: tokens.brand,
            width: "fit-content",
          }}
        >
          <BoltIcon sx={{ fontSize: 16, color: tokens.brand }} />
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.3,
              lineHeight: 1,
              color: tokens.brand,
            }}
          >
            {t("stats.fastDelivery")}
          </Typography>
        </Box>

        <Typography
          component="h1"
          sx={{
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: { xs: -1.2, md: -1.6 },
            fontSize: { xs: "2rem", sm: "2.5rem", md: "2.75rem", lg: "3rem" },
            color: { xs: "#FFFFFF", md: tokens.textPrimary },
            mb: 1,
            overflowWrap: "anywhere",
          }}
        >
          {t("titleLine1")} {t("titleLine2")}
        </Typography>

        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.5rem" },
            lineHeight: 1.3,
            letterSpacing: { xs: -0.4, md: -0.5 },
            color: { xs: tokens.brandHi, md: tokens.brand },
            mb: 2.5,
            overflowWrap: "anywhere",
          }}
        >
          {t("titleLine3")}
        </Typography>

        <Typography
          sx={{
            color: { xs: "rgba(255,255,255,0.85)", md: tokens.textSecondary },
            fontSize: { xs: "0.85rem", sm: "0.95rem" },
            lineHeight: 1.6,
            mb: 3.5,
            maxWidth: 420,
          }}
        >
          {t("subtitle")}
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Button
            component={Link}
            href="/menu"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: { xs: "0.9rem", sm: "1rem" },
              fontWeight: 800,
              borderRadius: "12px",
              bgcolor: tokens.brand,
              boxShadow: `0 4px 16px ${tokens.brandGlow}`,
              "&:hover": {
                bgcolor: tokens.brandHi,
                transform: "translateY(-1px)",
                boxShadow: `0 6px 22px ${tokens.brandGlow}`,
              },
            }}
          >
            {t("orderNow")}
          </Button>
        </Box>

        <Stack
          direction="row"
          sx={{
            gap: { xs: 2, sm: 3 },
            flexWrap: "wrap",
          }}
        >
          {stats.map((stat, i) => (
            <Stack key={i} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ color: { xs: "#FFFFFF", md: tokens.brand } }}>
                {stat.icon}
              </Box>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  color: { xs: "rgba(255,255,255,0.8)", md: tokens.textSecondary },
                  fontSize: 13,
                }}
              >
                {stat.text}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
