import { after } from "next/server";

/**
 * Запускает побочную работу (Telegram, push, Redis) ПОСЛЕ ответа клиенту так,
 * чтобы serverless-платформа (Vercel) не заморозила функцию раньше времени.
 *
 * Голый `void promise` на Vercel ненадёжен: функцию замораживают сразу после
 * отправки ответа, и недоехавшая отправка (например, уведомление кухне об
 * отмене заказа) теряется без следа. `after()` продлевает жизнь функции до
 * завершения задачи.
 *
 * Вне контекста запроса (скрипты, тесты) `after()` бросает синхронно -
 * тогда просто запускаем задачу как есть.
 */
export function runAfterResponse(task: () => Promise<unknown> | unknown): void {
    const safeTask = async () => {
        try {
            await task();
        } catch (error) {
            console.error("[after-response] background task failed:", error);
        }
    };

    try {
        after(safeTask);
    } catch {
        void safeTask();
    }
}
