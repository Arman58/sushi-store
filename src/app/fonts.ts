import { Inter } from "next/font/google";

/** Self-hosted via next/font — no extra network to Google Fonts at runtime. display: swap fixes FOIT audits. */
export const interFont = Inter({
    subsets: ["latin", "cyrillic"],
    display: "swap",
    variable: "--font-inter",
});
