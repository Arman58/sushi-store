"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { handleSessionExpired } from "@/features/auth/handle-session-expired";
import { LoginDialog } from "@/features/auth/ui/login-dialog";

/**
 * На странице профиля: если клиентская сессия пропала (401 / истёк JWT),
 * сбрасываем локальный стейт и показываем модалку входа.
 */
export function ProfileSessionGuard() {
    const { status } = useSession();
    const [loginOpen, setLoginOpen] = useState(false);
    const prevStatus = useRef(status);

    useEffect(() => {
        if (
            prevStatus.current === "authenticated" &&
            status === "unauthenticated"
        ) {
            void handleSessionExpired(() => setLoginOpen(true));
        }
        prevStatus.current = status;
    }, [status]);

    return (
        <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    );
}
