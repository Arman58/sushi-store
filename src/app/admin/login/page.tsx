"use server";

import { LoginForm } from "./login-form";

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

export default async function AdminLoginPage() {
    const envConfigured = Boolean(ADMIN_USER && ADMIN_PASS);

    return (
        <main
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                background:
                    "radial-gradient(circle at 20% 20%, rgba(249,115,22,0.12), transparent 35%), radial-gradient(circle at 80% 10%, rgba(234,179,8,0.16), transparent 30%), linear-gradient(135deg, #0f172a 0%, #111827 45%, #0b1222 100%)",
                padding: "32px 16px",
                color: "#e2e8f0",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 420,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                    borderRadius: 16,
                    padding: 28,
                    backdropFilter: "blur(12px)",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 12px",
                                borderRadius: 999,
                                background: "rgba(255,255,255,0.06)",
                                color: "#cbd5e1",
                                fontSize: 12,
                                letterSpacing: 0.4,
                            }}
                        >
                            Admin Area
                        </div>
                        <h1 style={{ margin: "12px 0 4px", fontSize: 24, color: "#f8fafc" }}>
                            Вход в админку
                        </h1>
                        <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>
                            Доступ только для авторизованных пользователей.
                        </p>
                    </div>
                </div>

                {!envConfigured && (
                    <div
                        style={{
                            marginBottom: 16,
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid rgba(248,113,113,0.35)",
                            background: "rgba(248,113,113,0.08)",
                            color: "#fecdd3",
                            fontSize: 13,
                        }}
                    >
                        ADMIN_USER / ADMIN_PASS не заданы. Добавьте их в .env.local и перезапустите dev.
                    </div>
                )}

                <LoginForm disabled={!envConfigured} />
            </div>
        </main>
    );
}
