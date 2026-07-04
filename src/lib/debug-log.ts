/**
 * Dev-only лог: в production молчит, чтобы не шуметь в консоли/серверных логах.
 * Ошибки по-прежнему логируются через console.error / Sentry.
 */
export function debugLog(...args: unknown[]): void {
    if (process.env.NODE_ENV !== "production") {
        console.log(...args);
    }
}
