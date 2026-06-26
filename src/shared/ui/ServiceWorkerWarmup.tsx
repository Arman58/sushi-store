"use client";

import { useEffect } from "react";

import { warmUpPushServiceWorker } from "@/lib/push-utils";

/** Регистрирует SW заранее, чтобы push не ждал активации по клику. */
export function ServiceWorkerWarmup() {
    useEffect(() => {
        if (process.env.NODE_ENV === "development") return;
        warmUpPushServiceWorker();
    }, []);

    return null;
}
