"use client";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DeliveryDiningIcon from "@mui/icons-material/DeliveryDining";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect } from "react";

import type { HeroPromo } from "@/lib/hero-data";
import { tokens } from "@/shared/ui/theme";

// ─── Keyframes ────────────────────────────────────────────────────────────────

const HERO_KF = `
@keyframes hero-orb-1 {
  0%, 100% { transform: translate(0%,  0%)   scale(1);    opacity: 0.22; }
  33%       { transform: translate(4%,  -8%)  scale(1.12); opacity: 0.30; }
  66%       { transform: translate(-5%, 6%)   scale(0.92); opacity: 0.18; }
}
@keyframes hero-orb-2 {
  0%, 100% { transform: translate(0%,  0%)  scale(1);    opacity: 0.15; }
  40%       { transform: translate(-6%, 5%)  scale(1.08); opacity: 0.22; }
  75%       { transform: translate(4%,  -4%) scale(0.95); opacity: 0.12; }
}
@keyframes hero-orb-3 {
  0%, 100% { transform: translate(0%,  0%)  scale(1);    opacity: 0.12; }
  50%       { transform: translate(3%, -6%)  scale(1.15); opacity: 0.20; }
}
@keyframes hero-float-1 {
  0%, 100% { transform: translateY(0px)   rotate(-3deg); }
  50%       { transform: translateY(-14px) rotate(3deg);  }
}
@keyframes hero-float-2 {
  0%, 100% { transform: translateY(0px)   rotate(4deg);  }
  50%       { transform: translateY(-10px) rotate(-2deg); }
}
@keyframes hero-float-3 {
  0%, 100% { transform: translateY(0px)   rotate(-2deg); }
  50%       { transform: translateY(-18px) rotate(5deg);  }
}
@keyframes hero-ticker {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes hero-badge-pulse {
  0%, 100% { box-shadow: 0 0 0 0   ${tokens.brand}44; }
  50%       { box-shadow: 0 0 0 8px ${tokens.brand}00; }
}
`;

function ensureHeroKf() {
  if (typeof document === "undefined") return;
  if (document.getElementById("hero-kf-v3")) return;
  const s = document.createElement("style");
  s.id = "hero-kf-v3";
  s.textContent = HERO_KF;
  document.head.appendChild(s);
}

// ─── Ticker items ─────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  "🍣  Роллы",
  "🍕  Пицца",
  "🌯  Шаурма",
  "🍗  Стрипсы",
  "🫓  Лахмаджо",
  "🥗  Салаты",
  "🍮  Десерты",
  "🥤  Напитки",
];

// ─── Floating food items (right side decoration) ──────────────────────────────

const FLOATERS = [
  { emoji: "🍣", size: 80, top: "12%",  right: "8%",  anim: "hero-float-1 5.5s ease-in-out infinite",  delay: "0s"   },
  { emoji: "🍕", size: 68, top: "42%",  right: "15%", anim: "hero-float-2 4.8s ease-in-out infinite",  delay: "0.8s" },
  { emoji: "🌯", size: 58, top: "68%",  right: "5%",  anim: "hero-float-3 6.2s ease-in-out infinite",  delay: "1.4s" },
  { emoji: "🍗", size: 48, top: "25%",  right: "27%", anim: "hero-float-1 5.0s ease-in-out infinite",  delay: "2s"   },
  { emoji: "🥤", size: 40, top: "76%",  right: "24%", anim: "hero-float-2 4.2s ease-in-out infinite",  delay: "0.3s" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export type HeroSectionProps = {
  deliveryStat: string;
  openingHoursStat: string;
  promo: HeroPromo | null;
};

export function HeroSection({ deliveryStat, openingHoursStat, promo }: HeroSectionProps) {
  useEffect(() => { ensureHeroKf(); }, []);

  const stats = [
    { icon: <DeliveryDiningIcon sx={{ fontSize: 15 }} />, text: deliveryStat },
    { icon: <AccessTimeIcon sx={{ fontSize: 15 }} />, text: openingHoursStat },
  ];

  return (
    <Box sx={{ mb: { xs: 0, sm: 4 } }}>
      <Box
        sx={{
          position: "relative",
          borderRadius: { xs: 0, sm: "24px" },
          overflow: "hidden",
          bgcolor: tokens.surface,
          border: `1px solid ${tokens.border}`,
          minHeight: { xs: 380, sm: 420, md: 460 },
          display: "flex",
          alignItems: "center",
          isolation: "isolate",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              width: "55%",
              paddingTop: "55%",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${tokens.brand}55 0%, transparent 70%)`,
              top: "-10%",
              left: "-15%",
              animation: "hero-orb-1 9s ease-in-out infinite",
              filter: "blur(40px)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              width: "45%",
              paddingTop: "45%",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${tokens.red}33 0%, transparent 70%)`,
              bottom: "-20%",
              right: "-10%",
              animation: "hero-orb-2 12s ease-in-out infinite",
              filter: "blur(50px)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              width: "35%",
              paddingTop: "35%",
              borderRadius: "50%",
              background: "radial-gradient(circle, #3B82F633 0%, transparent 70%)",
              top: "30%",
              right: "20%",
              animation: "hero-orb-3 8s ease-in-out infinite",
              filter: "blur(60px)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              opacity: 0.025,
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              backgroundSize: "200px",
            }}
          />
        </Box>

        {FLOATERS.map((f, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              top: f.top,
              right: f.right,
              display: { xs: "none", md: "block" },
              fontSize: f.size,
              lineHeight: 1,
              animation: f.anim,
              animationDelay: f.delay,
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
              userSelect: "none",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {f.emoji}
          </Box>
        ))}

        <Box
          sx={{
            position: "relative",
            zIndex: 2,
            px: { xs: 3, sm: 5, md: 8 },
            py: { xs: 5, sm: 6, md: 7 },
            maxWidth: { xs: "100%", md: "60%" },
          }}
        >
          {promo && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.75,
                py: 0.6,
                mb: 2.5,
                borderRadius: 999,
                bgcolor: tokens.brandDim,
                border: `1px solid ${tokens.brand}44`,
                animation: "hero-badge-pulse 3s ease-in-out infinite",
              }}
            >
              <Typography sx={{ fontSize: 14, lineHeight: 1 }}>🎁</Typography>
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{ color: "primary.dark", letterSpacing: 0.3, fontSize: 11 }}
              >
                Скидка {promo.discountValue}% на первый заказ по промокоду {promo.code}
              </Typography>
            </Box>
          )}

          <Typography
            component="h1"
            sx={{
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: { xs: -2, md: -3 },
              fontSize: { xs: "3rem", sm: "3.8rem", md: "4.6rem" },
              color: tokens.textPrimary,
              mb: 3,
            }}
          >
            <Box component="span" sx={{ display: "block" }}>
              Суши. Пицца.
            </Box>
            <Box component="span" sx={{ display: "block", mt: 0.25 }}>
              Шаурма.
            </Box>
            <Box
              component="span"
              sx={{
                display: "block",
                mt: 1,
                lineHeight: 1.05,
                letterSpacing: { xs: -1.5, md: -2 },
                fontSize: { xs: "2rem", sm: "2.4rem", md: "2.8rem" },
                background: `linear-gradient(90deg, ${tokens.brand} 0%, ${tokens.brandHi} 55%, #B8F5CC 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Горячо и быстро - у двери.
            </Box>
          </Typography>

          <Typography
            sx={{
              color: tokens.textSecondary,
              fontSize: { xs: "0.9rem", sm: "1rem" },
              lineHeight: 1.65,
              mb: 1.5,
              maxWidth: 460,
            }}
          >
            Закажите любимую еду с быстрой доставкой по Котайку и Еревану. Свежие
            роллы, горячая пицца и сочная шаурма.
          </Typography>

          <Typography
            component="p"
            variant="body2"
            sx={{
              color: tokens.textMuted,
              fontSize: { xs: "0.75rem", sm: "0.8rem" },
              lineHeight: 1.55,
              mb: 4,
              maxWidth: 520,
            }}
          >
            Hot sushi, pizza and shawarma with fast delivery in Yerevan and Nor
            Hachn. Free delivery in Nor Hachn.
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Button
              component={Link}
              href="/menu"
              variant="contained"
              size="large"
              sx={{
                px: 4.5,
                fontSize: "1rem",
                fontWeight: 900,
                letterSpacing: 0.3,
                borderRadius: "14px",
              }}
            >
              Заказать сейчас →
            </Button>
          </Stack>

          <Stack
            direction="row"
            sx={{
              mt: 4,
              pt: 3,
              borderTop: `1px solid ${tokens.border}`,
              flexWrap: "wrap",
              gap: { xs: 2, sm: 3 },
            }}
          >
            {stats.map((stat, i) => (
              <Stack key={i} direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ color: tokens.brand }}>{stat.icon}</Box>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ color: tokens.textSecondary, fontSize: 12 }}
                >
                  {stat.text}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          mt: { xs: 0, sm: 2 },
          overflow: "hidden",
          bgcolor: tokens.surfaceUp,
          borderTop:    { xs: `1px solid ${tokens.border}`, sm: "none" },
          borderBottom: { xs: `1px solid ${tokens.border}`, sm: "none" },
          borderRadius: { sm: "16px" },
          border:       { sm: `1px solid ${tokens.border}` },
          py: 0.75,
          position: "relative",
          "&::before, &::after": {
            content: '""',
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 60,
            zIndex: 2,
            pointerEvents: "none",
          },
          "&::before": {
            left: 0,
            background: `linear-gradient(to right, ${tokens.surfaceUp}, transparent)`,
          },
          "&::after": {
            right: 0,
            background: `linear-gradient(to left, ${tokens.surfaceUp}, transparent)`,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            width: "max-content",
            animation: "hero-ticker 22s linear infinite",
            "&:hover": { animationPlayState: "paused" },
          }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 3,
                whiteSpace: "nowrap",
              }}
            >
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ color: tokens.textSecondary, fontSize: 13 }}
              >
                {item}
              </Typography>
              <Box
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  bgcolor: tokens.brand + "88",
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
