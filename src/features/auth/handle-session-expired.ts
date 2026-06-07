"use client";

import { signOut } from "next-auth/react";

/** Сбрасывает протухшую клиентскую сессию и открывает модалку входа. */
export async function handleSessionExpired(
    openLoginDialog: () => void,
): Promise<void> {
    await signOut({ redirect: false });
    openLoginDialog();
}
