import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { POST as register } from "@/app/api/auth/register/route";
import { POST as resendOtp } from "@/app/api/auth/resend-otp/route";
import { POST as resendVerification } from "@/app/api/auth/resend-verification/route";
import { POST as verifyOtp } from "@/app/api/auth/verify-otp/route";
import * as authSession from "@/lib/auth";
import * as emailDelivery from "@/lib/email";
import { getOtpCode, saveOtpCode } from "@/lib/otp-store";
import * as rateLimit from "@/lib/rate-limit";
import * as upstash from "@/lib/upstash-redis";

let email = "";
let exists = true;
let verified = false;
let updates = 0;
const fakePrisma = {
    deliveryZone: {},
    user: {
        async findUnique() {
            return exists ? { id: 1, email, name: "Test", emailVerified: verified ? new Date() : null } : null;
        },
        async create() {
            exists = true;
            return { id: 1 };
        },
        async update() {
            updates += 1;
        },
    },
};

beforeEach(() => {
    exists = true;
    verified = false;
    updates = 0;
    (globalThis as { prisma?: unknown }).prisma = fakePrisma;
    mock.method(upstash, "getUpstashRedis", () => null);
    mock.method(rateLimit, "checkRateLimit", async () => ({ allowed: true }));
    mock.method(emailDelivery, "sendOtpEmail", async () => ({ sent: true }));
    mock.method(authSession, "auth", async () => ({ user: { id: 1 }, expires: "2099-01-01T00:00:00Z" }));
});

afterEach(() => mock.restoreAll());

function request(body: object, ip = "127.0.0.1"): Request {
    return new Request("http://localhost/api/auth/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": ip },
        body: JSON.stringify(body),
    });
}

describe("OTP route responses", () => {
    it("returns the same generic 401 for wrong, locked-out and unknown emails across IPs", async () => {
        email = "route-lockout@example.test";
        await saveOtpCode(email, "123456");
        for (let attempt = 0; attempt < 5; attempt++) {
            const response = await verifyOtp(request({ email, code: "654321" }, `192.0.2.${attempt}`));
            assert.equal(response.status, 401);
            assert.deepEqual(await response.json(), { error: "Unauthorized" });
        }
        assert.equal(await getOtpCode(email), null);
        const locked = await verifyOtp(request({ email, code: "123456" }));
        assert.equal(locked.status, 401);
        assert.deepEqual(await locked.json(), { error: "Unauthorized" });
        exists = false;
        const unknown = await verifyOtp(request({ email, code: "123456" }));
        assert.equal(unknown.status, 401);
        assert.deepEqual(await unknown.json(), { error: "Unauthorized" });
        assert.equal(updates, 0);
    });

    it("preserves successful verification and ordinary expiry responses", async () => {
        email = "route-success@example.test";
        await saveOtpCode(email, "123456");
        const success = await verifyOtp(request({ email, code: "123456" }));
        assert.equal(success.status, 200);
        assert.deepEqual(await success.json(), { ok: true });
        assert.equal(updates, 1);
        const expired = await verifyOtp(request({ email, code: "123456" }));
        assert.equal(expired.status, 410);
        assert.deepEqual(await expired.json(), { error: "OTP_EXPIRED" });
    });

    it("shares the cooldown across register and both resend routes while returning OTP_SENT", async () => {
        email = "route-shared-cooldown@example.test";
        exists = false;
        let sends = 0;
        mock.method(emailDelivery, "sendOtpEmail", async () => {
            sends += 1;
            return { sent: true };
        });
        const registered = await register(request({ email, password: "password123", name: "Test", locale: "en" }));
        assert.equal(registered.status, 200);
        assert.deepEqual(await registered.json(), { status: "OTP_SENT" });
        const code = await getOtpCode(email);
        assert.ok(code);
        const resent = await resendOtp(request({ email, locale: "en" }));
        const authenticatedResend = await resendVerification(request({ email, locale: "en" }));
        for (const response of [resent, authenticatedResend]) {
            assert.equal(response.status, 200);
            assert.deepEqual(await response.json(), { status: "OTP_SENT" });
        }
        assert.equal(sends, 1);
        assert.equal(await getOtpCode(email), code);
    });
});
