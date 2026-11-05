import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { isAllowedProductImageSrc } from "@/shared/lib/product-cover";

/** Зеркалит next.config.ts → images.remotePatterns: Cloudinary только наш аккаунт. */
describe("isAllowedProductImageSrc: Cloudinary", () => {
    const original = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    beforeEach(() => {
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "our-cloud";
    });

    afterEach(() => {
        if (original === undefined) delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        else process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = original;
    });

    it("разрешает картинки нашего аккаунта", () => {
        assert.equal(
            isAllowedProductImageSrc("https://res.cloudinary.com/our-cloud/image/upload/v1/p.jpg"),
            true,
        );
    });

    it("отклоняет чужой аккаунт Cloudinary", () => {
        assert.equal(
            isAllowedProductImageSrc("https://res.cloudinary.com/evil-cloud/image/upload/v1/p.avif"),
            false,
        );
    });

    it("не принимает аккаунт-префикс как часть другого имени", () => {
        assert.equal(
            isAllowedProductImageSrc("https://res.cloudinary.com/our-cloud-evil/image/upload/p.jpg"),
            false,
        );
    });

    it("без имени аккаунта Cloudinary не разрешён вовсе (fail closed)", () => {
        delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        assert.equal(
            isAllowedProductImageSrc("https://res.cloudinary.com/our-cloud/image/upload/p.jpg"),
            false,
        );
    });

    it("остальные разрешённые источники не затронуты", () => {
        assert.equal(isAllowedProductImageSrc("https://images.unsplash.com/photo-1?w=800"), true);
        assert.equal(isAllowedProductImageSrc("/uploads/p.jpg"), true);
        assert.equal(isAllowedProductImageSrc("https://example.com/p.jpg"), false);
    });
});
