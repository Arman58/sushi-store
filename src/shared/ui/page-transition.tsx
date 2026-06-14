"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";

import { usePathname } from "@/i18n/server";

const transition = { duration: 0.15, ease: "easeOut" as const };

/**
 * Fast page enter animation without AnimatePresence.
 * AnimatePresence + mode="wait" unmounts the page tree while Suspense/async
 * RSC work is still tracked — that triggers React's "async info not on parent
 * Suspense boundary" warning (especially visible in React DevTools).
 */
export function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const reduceMotion = useReducedMotion();
    const [entered, setEntered] = useState(true);

    useEffect(() => {
        if (reduceMotion) {
            setEntered(true);
            return;
        }

        setEntered(false);
        const frame = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(frame);
    }, [pathname, reduceMotion]);

    return (
        <motion.div
            animate={
                reduceMotion || entered
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 10 }
            }
            transition={transition}
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                width: "100%",
            }}
        >
            {children}
        </motion.div>
    );
}
