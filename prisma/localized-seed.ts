import type { Prisma } from "@prisma/client";

export type LocalizedText = {
    hy: string;
    ru: string;
    en: string;
};

/** Обёртка для демо-данных: ru обязателен, hy/en опциональны. */
export function L(ru: string, hy?: string, en?: string): LocalizedText {
    return {
        hy: hy ?? ru,
        ru,
        en: en ?? ru,
    };
}

export function LToJson(text: LocalizedText): Prisma.InputJsonValue {
    return text;
}
