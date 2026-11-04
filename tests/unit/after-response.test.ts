import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runAfterResponse } from "@/lib/after-response";

/** Вне контекста запроса after() бросает - хелпер должен просто выполнить задачу. */
describe("runAfterResponse", () => {
    it("выполняет задачу вне контекста запроса", async () => {
        let ran = false;
        runAfterResponse(async () => {
            ran = true;
        });
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(ran, true);
    });

    it("не пробрасывает ошибки задачи и не роняет вызывающий код", async () => {
        const originalError = console.error;
        let logged = false;
        console.error = () => {
            logged = true;
        };
        try {
            assert.doesNotThrow(() =>
                runAfterResponse(async () => {
                    throw new Error("boom");
                }),
            );
            await new Promise((resolve) => setImmediate(resolve));
            assert.equal(logged, true);
        } finally {
            console.error = originalError;
        }
    });

    it("переживает синхронно бросающую задачу", async () => {
        const originalError = console.error;
        console.error = () => {};
        try {
            assert.doesNotThrow(() =>
                runAfterResponse(() => {
                    throw new Error("sync boom");
                }),
            );
            await new Promise((resolve) => setImmediate(resolve));
        } finally {
            console.error = originalError;
        }
    });
});
