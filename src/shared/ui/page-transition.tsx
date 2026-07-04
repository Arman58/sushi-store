"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const transition = { duration: 0.15, ease: "easeOut" as const };

const shellStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    width: "100%",
} as const;

/**
 * Stable layout wrapper for store pages.
 * Do not re-animate or remount on pathname changes - that breaks RSC Suspense
 * tracking and triggers React's "async info not on parent Suspense boundary"
 * warning (often surfaced via React DevTools).
 */
export function PageTransition({ children }: { children: ReactNode }) {
    const reduceMotion = useReducedMotion();

    if (reduceMotion) {
        return <div style={shellStyle}>{children}</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            style={shellStyle}
        >
            {children}
        </motion.div>
    );
}
