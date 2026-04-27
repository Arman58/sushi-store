"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
    user: z.string().min(1, "Введите логин"),
    pass: z.string().min(1, "Введите пароль"),
});

type LoginFormValues = z.infer<typeof schema>;

type LoginFormProps = {
    disabled?: boolean;
};

export function LoginForm({ disabled }: LoginFormProps) {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(schema),
        mode: "onBlur",
    });

    const onSubmit = async (values: LoginFormValues) => {
        if (disabled) return;
        setServerError(null);

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                body: new URLSearchParams(values),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Неверный логин или пароль");
            }

            router.replace("/admin/orders");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Не удалось войти";
            setServerError(message);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#cbd5e1" }}>Логин</span>
                <input
                    {...register("user")}
                    type="text"
                    placeholder="ADMIN_USER"
                    disabled={disabled || isSubmitting}
                    style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(148,163,184,0.4)",
                        background: "rgba(15,23,42,0.7)",
                        color: "#e2e8f0",
                        outline: "none",
                    }}
                />
                {errors.user && (
                    <span style={{ color: "#fca5a5", fontSize: 12 }}>
                        {errors.user.message}
                    </span>
                )}
            </label>

            <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#cbd5e1" }}>Пароль</span>
                <input
                    {...register("pass")}
                    type="password"
                    placeholder="ADMIN_PASS"
                    disabled={disabled || isSubmitting}
                    style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(148,163,184,0.4)",
                        background: "rgba(15,23,42,0.7)",
                        color: "#e2e8f0",
                        outline: "none",
                    }}
                />
                {errors.pass && (
                    <span style={{ color: "#fca5a5", fontSize: 12 }}>
                        {errors.pass.message}
                    </span>
                )}
            </label>

            {serverError && (
                <div
                    style={{
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid rgba(248,113,113,0.35)",
                        background: "rgba(248,113,113,0.08)",
                        color: "#fecdd3",
                        fontSize: 13,
                    }}
                >
                    {serverError}
                </div>
            )}

            <button
                type="submit"
                disabled={disabled || isSubmitting}
                style={{
                    marginTop: 4,
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "none",
                    background:
                        "linear-gradient(135deg, #f97316 0%, #f59e0b 40%, #f97316 100%)",
                    color: "#0b1222",
                    fontWeight: 800,
                    letterSpacing: 0.3,
                    cursor: disabled || isSubmitting ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.6 : 1,
                    boxShadow: "0 12px 28px rgba(249,115,22,0.35)",
                }}
            >
                {isSubmitting ? "Входим..." : "Войти"}
            </button>
        </form>
    );
}
