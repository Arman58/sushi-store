import type { OrderStatus } from "@prisma/client";

import {
    CONTACT_PHONE,
    DEFAULT_OG_IMAGE,
    KITCHEN_ADDRESS,
    OPENING_HOURS,
    SERVES_CUISINE,
    SITE_NAME,
    SITE_URL,
} from "@/lib/site-config";

type JsonLdProps = {
    data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: JsonLdProps) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}

export function restaurantJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "@id": `${SITE_URL}/#restaurant`,
        name: SITE_NAME,
        url: SITE_URL,
        telephone: CONTACT_PHONE,
        openingHours: OPENING_HOURS.schema,
        image: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
        logo: `${SITE_URL}/east-west-logo.png`,
        address: {
            "@type": "PostalAddress",
            streetAddress: KITCHEN_ADDRESS.street,
            addressLocality: KITCHEN_ADDRESS.locality,
            addressRegion: KITCHEN_ADDRESS.region,
            addressCountry: KITCHEN_ADDRESS.country,
        },
        servesCuisine: [...SERVES_CUISINE],
        hasMenu: `${SITE_URL}/menu`,
        areaServed: [
            { "@type": "City", name: "Ереван" },
            { "@type": "AdministrativeArea", name: "Котайк" },
        ],
        openingHoursSpecification: [
            {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: [...OPENING_HOURS.days],
                opens: OPENING_HOURS.opens,
                closes: OPENING_HOURS.closes === "00:00" ? "24:00" : OPENING_HOURS.closes,
            },
        ],
        potentialAction: {
            "@type": "OrderAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${SITE_URL}/menu`,
                actionPlatform: [
                    "http://schema.org/DesktopWebPlatform",
                    "http://schema.org/MobileWebPlatform",
                ],
            },
            deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
        },
    };
}

const ORDER_STATUS_TO_SCHEMA: Partial<Record<OrderStatus, string>> = {
    NEW: "https://schema.org/OrderProcessing",
    COOKING: "https://schema.org/OrderProcessing",
    DELIVERING: "https://schema.org/OrderInTransit",
    DONE: "https://schema.org/OrderDelivered",
};

type OrderJsonLdInput = {
    id: number;
    status: OrderStatus;
    totalPrice: number;
    createdAt: Date;
    items: { name: string; quantity: number; price: number }[];
};

export function orderJsonLd(order: OrderJsonLdInput) {
    const orderStatus = ORDER_STATUS_TO_SCHEMA[order.status];
    if (!orderStatus) return null;

    return {
        "@context": "https://schema.org",
        "@type": "Order",
        orderNumber: String(order.id),
        orderStatus,
        orderDate: order.createdAt.toISOString(),
        price: order.totalPrice,
        priceCurrency: "AMD",
        seller: {
            "@type": "Restaurant",
            name: SITE_NAME,
            url: SITE_URL,
        },
        orderedItem: order.items.map((item) => ({
            "@type": "OrderItem",
            orderQuantity: item.quantity,
            orderedItem: {
                "@type": "Product",
                name: item.name,
                offers: {
                    "@type": "Offer",
                    price: item.price,
                    priceCurrency: "AMD",
                },
            },
        })),
    };
}
