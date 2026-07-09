import { Inter } from "next/font/google";

/**
 * Self-hosted via next/font — без запроса к Google Fonts в рантайме.
 *
 * latin + cyrillic нужны для en/ru (и латиницы в hy UI).
 * preload: false — иначе Next вставляет <link rel=preload> на ОБА woff2,
 * а браузер по unicode-range сразу использует только один → Chrome warning
 * «preloaded but not used» (часто ×2 на checkout из-за layout/hydration).
 * Шрифт всё равно грузится из @font-face при первом CSS (display: swap).
 */
export const interFont = Inter({
    subsets: ["latin", "cyrillic"],
    display: "swap",
    variable: "--font-inter",
    preload: false,
    adjustFontFallback: true,
});
