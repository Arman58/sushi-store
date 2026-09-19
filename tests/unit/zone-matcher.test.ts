import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DeliveryZoneOption } from "@/features/checkout/model/types";
import { matchAddressToDeliveryZone } from "@/features/checkout/model/zone-matcher";

const mockZones: DeliveryZoneOption[] = [
    {
        id: 1,
        name: "Нор Ачин",
        deliveryPrice: 0,
        minOrderAmount: 1500,
        aliases: [
            "Нор Ачин",
            "Нор Ачн",
            "Норачин",
            "Nor Hachn",
            "Nor Hajn",
            "Nor Hachin",
            "Նոր Հաճն",
            "Հաճն",
            "Hachn",
        ],
    },
    {
        id: 2,
        name: "Нор Гехи (от 700 до 1200 ֏)",
        deliveryPrice: 700,
        minOrderAmount: 1500,
        aliases: [
            "Нор Гехи",
            "Нор Геги",
            "Норгехи",
            "Նոր Գեղի",
            "Նոր Գեխի",
            "Nor Geghi",
            "Nor Gegi",
        ],
    },
    {
        id: 3,
        name: "Артамет",
        deliveryPrice: 900,
        minOrderAmount: 1500,
        aliases: ["Артамет", "Արտամետ", "Artamet"],
    },
    {
        id: 4,
        name: "Мргашен",
        deliveryPrice: 1200,
        minOrderAmount: 1500,
        aliases: ["Мргашен", "Մրգաշեն", "Mrgashen"],
    },
    {
        id: 5,
        name: "Другие города (уточнение по звонку)",
        deliveryPrice: 0,
        minOrderAmount: 0,
        requiresManagerApproval: true,
        aliases: ["Другие города", "Այլ քաղաքներ", "Other cities"],
    },
];

describe("matchAddressToDeliveryZone", () => {
    it("распознает Нор Ачин на русском", () => {
        const match = matchAddressToDeliveryZone("г. Нор Ачин, ул. Торосяна 5", mockZones);
        assert.equal(match?.id, 1);
        assert.equal(match?.name, "Нор Ачин");
    });

    it("распознает Нор Ачн (сокращенный вариант)", () => {
        const match = matchAddressToDeliveryZone("Нор Ачн, Чаренца 12", mockZones);
        assert.equal(match?.id, 1);
    });

    it("распознает Нор Ачин на армянском (Նոր Հաճն)", () => {
        const match = matchAddressToDeliveryZone("Նոր Հաճն, Թորոսյան 5", mockZones);
        assert.equal(match?.id, 1);
    });

    it("распознает Nor Hachn на английском", () => {
        const match = matchAddressToDeliveryZone("Nor Hachn, Charents 10", mockZones);
        assert.equal(match?.id, 1);
    });

    it("корректно различает Нор Гехи и не путает с Нор Ачин", () => {
        const match = matchAddressToDeliveryZone("Нор Гехи, 3 улица, дом 8", mockZones);
        assert.equal(match?.id, 2);
    });

    it("распознает Артамет и Мргашен", () => {
        const artamet = matchAddressToDeliveryZone("Артамет, центральная 1", mockZones);
        assert.equal(artamet?.id, 3);

        const mrgashen = matchAddressToDeliveryZone("с. Мргашен, 5 линия", mockZones);
        assert.equal(mrgashen?.id, 4);
    });

    it("не сопоставляет неизвестный адрес случайным образом", () => {
        const unknown = matchAddressToDeliveryZone("г. Париж, Елисейские поля 1", mockZones);
        assert.equal(unknown, null);
    });

    it("возвращает null для пустого адреса или пустого списка зон", () => {
        assert.equal(matchAddressToDeliveryZone("", mockZones), null);
        assert.equal(matchAddressToDeliveryZone("Торосяна 5", []), null);
    });
});
