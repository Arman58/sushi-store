"use client";

import { useEffect } from "react";

/** Прогрев SW — только register, без ожидания ready (не блокирует UI). */
export function ServiceWorkerWarmup() {
    useEffect(() => {
        if (process.env.NODE_ENV === "development") return;
        if (!("serviceWorker" in navigator)) return;

        void navigator.serviceWorker
            .register("/sw.js", { scope: "/", updateViaCache: "none" })
            .catch((error: unknown) => {
                console.warn("[PUSH] Service worker warmup register failed:", error);
            });
    }, []);

    return null;
}
