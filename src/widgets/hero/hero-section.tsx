"use client";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DeliveryDiningIcon from "@mui/icons-material/DeliveryDining";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect } from "react";

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
  0%, 100% { box-shadow: 0 0 0 0   ${tokens.orange}44; }
  50%       { box-shadow: 0 0 0 8px ${tokens.orange}00; }
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

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS = [
  { icon: <DeliveryDiningIcon sx={{ fontSize: 15 }} />, text: "45–60 мин доставка" },
  { icon: <AccessTimeIcon     sx={{ fontSize: 15 }} />, text: "11:00 – 23:00" },
  { icon: <StarRoundedIcon    sx={{ fontSize: 15 }} />, text: "4.9 · 800+ отзывов" },
] as const;

// ─── Floating food items (right side decoration) ──────────────────────────────

const FLOATERS = [
  { emoji: "🍣", size: 80, top: "12%",  right: "8%",  anim: "hero-float-1 5.5s ease-in-out infinite",  delay: "0s"   },
  { emoji: "🍕", size: 68, top: "42%",  right: "15%", anim: "hero-float-2 4.8s ease-in-out infinite",  delay: "0.8s" },
  { emoji: "🌯", size: 58, top: "68%",  right: "5%",  anim: "hero-float-3 6.2s ease-in-out infinite",  delay: "1.4s" },
  { emoji: "🍗", size: 48, top: "25%",  right: "27%", anim: "hero-float-1 5.0s ease-in-out infinite",  delay: "2s"   },
  { emoji: "🥤", size: 40, top: "76%",  right: "24%", anim: "hero-float-2 4.2s ease-in-out infinite",  delay: "0.3s" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function HeroSection() {
  useEffect(() => { ensureHeroKf(); }, []);

  return (
    <Box sx={{ mb: { xs: 0, sm: 4 } }}>
      {/* ════════════════════════════════════════════════════════════
          MAIN CINEMATIC HERO BLOCK
      ════════════════════════════════════════════════════════════ */}
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
        {/* ── Animated ambient orbs ── */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {/* Orb 1 — warm orange left */}
          <Box
            sx={{
              position: "absolute",
              width: "55%",
              paddingTop: "55%",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${tokens.orange}55 0%, transparent 70%)`,
              top: "-10%",
              left: "-15%",
              animation: "hero-orb-1 9s ease-in-out infinite",
              filter: "blur(40px)",
            }}
          />
          {/* Orb 2 — red bottom-right */}
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
          {/* Orb 3 — blue accent mid */}
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
          {/* Noise texture */}
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

        {/* ── Floating food emojis (right side, desktop) ── */}
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

        {/* ── Content ── */}
        <Box
          sx={{
            position: "relative",
            zIndex: 2,
            px: { xs: 3, sm: 5, md: 8 },
            py: { xs: 5, sm: 6, md: 7 },
            maxWidth: { xs: "100%", md: "60%" },
          }}
        >
          {/* Tag pill */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.75,
              py: 0.6,
              mb: 2.5,
              borderRadius: 999,
              bgcolor: tokens.orangeDim,
              border: `1px solid ${tokens.orange}44`,
              animation: "hero-badge-pulse 3s ease-in-out infinite",
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: tokens.orange,
                boxShadow: `0 0 6px ${tokens.orange}`,
              }}
            />
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color: tokens.orange, letterSpacing: 0.5, fontSize: 11 }}
            >
              🔥 Акция дня — доставка за 45 мин
            </Typography>
          </Box>

          {/* Headline — cinematic typographic stack */}
          <Box sx={{ mb: 3 }}>
            <Typography
              component="h1"
              sx={{
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: { xs: -2, md: -3 },
                fontSize: { xs: "3rem", sm: "3.8rem", md: "4.6rem" },
                color: tokens.textPrimary,
                display: "block",
              }}
            >
              Суши. Пицца.
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: { xs: -2, md: -3 },
                fontSize: { xs: "3rem", sm: "3.8rem", md: "4.6rem" },
                color: tokens.textPrimary,
                display: "block",
                mt: 0.25,
              }}
            >
              Шаурма.
            </Typography>
            {/* Gradient accent line */}
            <Typography
              component="h1"
              sx={{
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: { xs: -1.5, md: -2 },
                fontSize: { xs: "2rem", sm: "2.4rem", md: "2.8rem" },
                background: `linear-gradient(90deg, ${tokens.orange} 0%, ${tokens.orangeHi} 55%, #FFCC88 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                display: "block",
                mt: 1,
              }}
            >
              Горячо и быстро — у двери.
            </Typography>
          </Box>

          {/* Sub */}
          <Typography
            sx={{
              color: tokens.textSecondary,
              fontSize: { xs: "0.9rem", sm: "1rem" },
              lineHeight: 1.65,
              mb: 4,
              maxWidth: 460,
            }}
          >
            Бесплатная доставка от 3 000&thinsp;֏. Роллы, пицца и шаурма от лучших
            поваров — прямо до вашей двери.
          </Typography>

          {/* CTA row */}
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

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2.25,
                py: 1.25,
                borderRadius: "14px",
                bgcolor: tokens.surfaceUp,
                border: `1px solid ${tokens.border}`,
                cursor: "default",
              }}
            >
              <Typography sx={{ fontSize: 18, lineHeight: 1 }}>🎁</Typography>
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{ color: tokens.green, fontSize: 13 }}
              >
                −20% на первый заказ
              </Typography>
            </Box>
          </Stack>

          {/* Stats bar */}
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
            {STATS.map((stat, i) => (
              <Stack key={i} direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ color: tokens.orange }}>{stat.icon}</Box>
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

      {/* ════════════════════════════════════════════════════════════
          SCROLLING FOOD TICKER — below hero
      ════════════════════════════════════════════════════════════ */}
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
          // Fade edges
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
          {/* Duplicate for seamless loop */}
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
                  bgcolor: tokens.orange + "88",
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
