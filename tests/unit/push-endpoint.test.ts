import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isValidPushEndpoint } from "@/lib/push-endpoint";

describe("isValidPushEndpoint", () => {
    const allowed = [
        "https://fcm.googleapis.com/fcm/send/token",
        "https://updates.push.services.mozilla.com/wpush/v2/token",
        "https://updates-autopush.push.services.mozilla.com/wpush/v2/token",
        "https://region.updates.push.services.mozilla.com/wpush/v2/token",
        "https://web.push.apple.com/token",
        "https://region.push.apple.com/token",
        "https://wns2-by3p.notify.windows.com/?token=abc",
        "https://db5.notify.windows.com/?token=abc",
        "HTTPS://FCM.GOOGLEAPIS.COM/fcm/send/token",
        "https://fcm.googleapis.com:443/fcm/send/token",
    ];
    for (const endpoint of allowed) {
        it(`accepts ${endpoint}`, () => {
            assert.equal(isValidPushEndpoint(endpoint), true);
        });
    }

    const rejected = [
        "",
        "not a URL",
        "//fcm.googleapis.com/token",
        "https:fcm.googleapis.com/token",
        "http://fcm.googleapis.com/token",
        "ftp://fcm.googleapis.com/token",
        "https://fcm.googleapis.com.evil.test/token",
        "https://evil-fcm.googleapis.com/token",
        "https://sub.fcm.googleapis.com/token",
        "https://evilpush.services.mozilla.com/token",
        "https://updates.push.services.mozilla.com.evil.test/token",
        "https://web.push.apple.com.evil.test/token",
        "https://evilpush.apple.com/token",
        "https://wns2-evil.notify.windows.com.evil.test/token",
        "https://evilnotify.windows.com/token",
        "https://push.services.mozilla.com/token",
        "https://push.apple.com/token",
        "https://notify.windows.com/token",
        "https://127.0.0.1/token",
        "https://2130706433/token",
        "https://0x7f000001/token",
        "https://[::1]/token",
        "https://[::ffff:127.0.0.1]/token",
        "https://169.254.169.254/latest/meta-data",
        "https://localhost/token",
        "https://localhost.localdomain/token",
        "https://user@fcm.googleapis.com/token",
        "https://user:password@fcm.googleapis.com/token",
        "https://@fcm.googleapis.com/token",
        "https://fcm.googleapis.com@127.0.0.1/token",
        "https://fcm.googleapis.com:80/token",
        "https://fcm.googleapis.com:444/token",
        "https://fcm.googleapis.com:8443/token",
        "https://FCM.GOOGLEAPIS.COM./token",
        "https://updates.push.services.mozilla.com./token",
        "https://web.push.apple.com./token",
        "https://wns2-test.notify.windows.com./token",
        "https://.push.apple.com/token",
        "https://bad..push.apple.com/token",
        "https://-bad.push.apple.com/token",
        " https://fcm.googleapis.com/token",
        "https://fcm.google\napis.com/token",
        "https://fcm.googleapis.com\\@evil.test/token",
    ];
    for (const endpoint of rejected) {
        it(`rejects ${JSON.stringify(endpoint)}`, () => {
            assert.equal(isValidPushEndpoint(endpoint), false);
        });
    }

    it("accepts at most 2048 characters", () => {
        const prefix = "https://fcm.googleapis.com/";
        const endpoint = prefix + "a".repeat(2048 - prefix.length);
        assert.equal(isValidPushEndpoint(endpoint), true);
        assert.equal(isValidPushEndpoint(endpoint + "a"), false);
    });
});
