/**
 * Fail-fast проверка критичных env-переменных при старте Node-процесса.
 * Импортируется из instrumentation.ts до обработки запросов.
 */

const MIN_SECRET_LENGTH = 32;

function requireEnv(name: string, minLength = 1): string {
    const value = process.env[name]?.trim() ?? "";
    if (value.length < minLength) {
        throw new Error(
            `[env] ${name} is required` +
                (minLength > 1 ? ` (min ${minLength} chars)` : "") +
                `. Check .env / deployment config.`,
        );
    }
    return value;
}

export function assertProductionEnv(): void {
    if (process.env.NODE_ENV !== "production") return;

    requireEnv("DATABASE_URL");
    requireEnv("NEXTAUTH_SECRET", MIN_SECRET_LENGTH);
    requireEnv("ADMIN_SESSION_SECRET", MIN_SECRET_LENGTH);
}
