import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, type Mock,mock } from "node:test";

import * as emailDelivery from "@/lib/email";
import { issueOtpForEmail, verifyOtpCode } from "@/lib/otp-auth";
import {
    claimOtpResendCooldown,
    deleteOtpCode,
    getOtpCode,
    OTP_MAX_FAILED_ATTEMPTS,
    OTP_RESEND_COOLDOWN_SECONDS,
    OTP_TTL_SECONDS,
    saveOtpCode,
} from "@/lib/otp-store";
import * as upstash from "@/lib/upstash-redis";

let sendMock: Mock<typeof emailDelivery.sendOtpEmail>;

// Stub the shared client and delivery before exercising any OTP operation:
// these tests never use configured Redis credentials or send real emails.
beforeEach(() => {
    mock.method(upstash, "getUpstashRedis", () => null);
    sendMock = mock.method(emailDelivery, "sendOtpEmail", async () => ({ sent: true }));
});

afterEach(() => mock.restoreAll());

describe("per-email OTP attempts", () => {
    it("counts wrong codes across normalized addresses and deletes the fifth", async () => {
        const email = "attempts@example.test";
        await saveOtpCode(email, "123456");
        for (let attempt = 1; attempt <= OTP_MAX_FAILED_ATTEMPTS; attempt++) {
            assert.equal(await verifyOtpCode(" ATTEMPTS@EXAMPLE.TEST ", "654321"), "invalid");
            assert.equal(await getOtpCode(email), attempt < OTP_MAX_FAILED_ATTEMPTS ? "123456" : null);
        }
        assert.equal(await verifyOtpCode(email, "123456"), "invalid");
        assert.equal(await verifyOtpCode(email, "654321"), "invalid");
    });

    it("accepts a correct fifth attempt, consumes the code and resets the counter", async () => {
        const email = "success@example.test";
        await saveOtpCode(email, "123456");
        for (let attempt = 1; attempt < OTP_MAX_FAILED_ATTEMPTS; attempt++) {
            assert.equal(await verifyOtpCode(email, "654321"), "invalid");
        }
        assert.equal(await verifyOtpCode(email, " 123456 "), "valid");
        assert.equal(await getOtpCode(email), null);
        assert.equal(await verifyOtpCode(email, "123456"), "expired");
        await saveOtpCode(email, "234567");
        assert.equal(await verifyOtpCode(email, "654321"), "invalid");
        assert.equal(await verifyOtpCode(email, "234567"), "valid");
    });

    it("a newly issued code unlocks an email with a fresh attempt budget", async () => {
        const email = "unlock@example.test";
        await saveOtpCode(email, "123456");
        for (let attempt = 0; attempt < OTP_MAX_FAILED_ATTEMPTS; attempt++) {
            await verifyOtpCode(email, "654321");
        }
        await saveOtpCode(email, "234567");
        for (let attempt = 1; attempt < OTP_MAX_FAILED_ATTEMPTS; attempt++) {
            assert.equal(await verifyOtpCode(email, "654321"), "invalid");
        }
        assert.equal(await verifyOtpCode(email, "234567"), "valid");
    });

    it("does not share attempts between emails", async () => {
        await saveOtpCode("isolated-a@example.test", "123456");
        await saveOtpCode("isolated-b@example.test", "123456");
        for (let attempt = 0; attempt < OTP_MAX_FAILED_ATTEMPTS; attempt++) {
            await verifyOtpCode("isolated-a@example.test", "654321");
        }
        assert.equal(await verifyOtpCode("isolated-b@example.test", "123456"), "valid");
    });

    it("concurrent guesses exhaust one shared budget and cannot reuse a correct code", async () => {
        const email = "concurrent@example.test";
        await saveOtpCode(email, "123456");
        await Promise.all(Array.from({ length: 10 }, () => verifyOtpCode(email, "654321")));
        assert.equal(await getOtpCode(email), null);
        assert.equal(await verifyOtpCode(email, "123456"), "invalid");
        await saveOtpCode(email, "234567");
        const results = await Promise.all(Array.from({ length: 10 }, () => verifyOtpCode(email, "234567")));
        assert.equal(results.filter((result) => result === "valid").length, 1);
    });

    it("expires the code and lockout at the original deadline without extending it", async () => {
        let now = 1_000_000;
        mock.method(Date, "now", () => now);
        const activeEmail = "expired-code@example.test";
        const lockedEmail = "expired-lockout@example.test";
        await saveOtpCode(activeEmail, "123456");
        await saveOtpCode(lockedEmail, "123456");
        now += (OTP_TTL_SECONDS - 1) * 1000;
        for (let attempt = 0; attempt < OTP_MAX_FAILED_ATTEMPTS; attempt++) {
            await verifyOtpCode(lockedEmail, "654321");
        }
        assert.equal(await verifyOtpCode(lockedEmail, "123456"), "invalid");
        now += 1000;
        assert.equal(await getOtpCode(activeEmail), null);
        assert.equal(await verifyOtpCode(activeEmail, "123456"), "expired");
        assert.equal(await verifyOtpCode(lockedEmail, "123456"), "expired");
    });
});

describe("per-email OTP resend cooldown", () => {
    it("blocks a second send without replacing the code or resetting attempts", async () => {
        const email = "resend@example.test";
        const first = await issueOtpForEmail(email, "en");
        assert.equal(first.sent, true);
        assert.ok(first.code);
        const wrongCode = first.code === "123456" ? "654321" : "123456";
        for (let attempt = 1; attempt < OTP_MAX_FAILED_ATTEMPTS; attempt++) {
            await verifyOtpCode(email, wrongCode);
        }
        assert.deepEqual(await issueOtpForEmail(" RESEND@EXAMPLE.TEST ", "ru"), {
            code: null, sent: false, cooldown: true,
        });
        assert.equal(sendMock.mock.callCount(), 1);
        assert.equal(await getOtpCode(email), first.code);
        assert.equal(await verifyOtpCode(email, wrongCode), "invalid");
        assert.equal(await getOtpCode(email), null);
    });

    it("expires after exactly 60 seconds and does not extend on blocked requests", async () => {
        let now = 2_000_000;
        mock.method(Date, "now", () => now);
        const email = "cooldown-expiry@example.test";
        assert.equal((await issueOtpForEmail(email)).sent, true);
        now += OTP_RESEND_COOLDOWN_SECONDS * 1000 - 1;
        assert.equal((await issueOtpForEmail(email)).cooldown, true);
        now += 1;
        assert.equal((await issueOtpForEmail(email)).sent, true);
        assert.equal(sendMock.mock.callCount(), 2);
    });

    it("allows independent addresses and only one concurrent send per email", async () => {
        const results = await Promise.all(Array.from({ length: 10 }, () => issueOtpForEmail("parallel@example.test")));
        assert.equal(results.filter((result) => result.sent).length, 1);
        assert.equal((await issueOtpForEmail("other@example.test")).sent, true);
        assert.equal(sendMock.mock.callCount(), 2);
    });

    it("keeps the cooldown after successful verification or explicit code deletion", async () => {
        const email = "consumed-cooldown@example.test";
        const { code } = await issueOtpForEmail(email);
        assert.ok(code);
        assert.equal(await verifyOtpCode(email, code), "valid");
        assert.equal(await claimOtpResendCooldown(email), false);
        await deleteOtpCode(email);
        assert.equal(await claimOtpResendCooldown(email), false);
    });

    it("keeps the cooldown when delivery fails", async () => {
        sendMock.mock.mockImplementation(async () => ({ sent: false }));
        const first = await issueOtpForEmail("failed-send@example.test");
        assert.equal(first.sent, false);
        assert.equal(first.cooldown, undefined);
        assert.equal((await issueOtpForEmail("failed-send@example.test")).cooldown, true);
        assert.equal(sendMock.mock.callCount(), 1);
    });
});
