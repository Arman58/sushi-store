import type { OrderStatus } from "@prisma/client";

import {
    CONTACT_PHONE,
    DEFAULT_OG_IMAGE,
    KITCHEN_ADDRESS,
    OPENING_HOURS,
    SERVES_CUISINE,
    SITE_LOGO_PATH,
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

export function foodDeliveryServiceJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${SITE_URL}/#food-delivery`,
        name: "Food Delivery in Yerevan and Nor Hachn",
        description: "Fast delivery of sushi, pizza and shawarma",
        provider: {
            "@type": "Restaurant",
            name: SITE_NAME,
            url: SITE_URL,
        },
        areaServed: [
            { "@type": "City", name: "Yerevan" },
            { "@type": "City", name: "Nor Hachn" },
            { "@type": "AdministrativeArea", name: "Kotayk Region" },
        ],
        serviceType: "Food Delivery",
    };
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
        logo: `${SITE_URL}${SITE_LOGO_PATH}`,
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
            { "@type": "City", name: "Yerevan" },
            { "@type": "City", name: "Nor Hachn" },
            { "@type": "AdministrativeArea", name: "Kotayk Region" },
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

type ProductJsonLdInput = {
    name: string;
    description: string | null;
    image: string | null;
    price: number;
    url: string;
    /** Средний рейтинг из отзывов; aggregateRating добавляется при count > 0. */
    ratingAvg?: number;
    ratingCount?: number;
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

export function productJsonLd(input: ProductJsonLdInput) {
    return {
        "@context": "https://schema.org",
        "@type": "Product",
        name: input.name,
        ...(input.description ? { description: input.description } : {}),
        ...(input.image ? { image: [input.image] } : {}),
        offers: {
            "@type": "Offer",
            price: input.price,
            priceCurrency: "AMD",
            availability: "https://schema.org/InStock",
            url: input.url,
        },
        ...(input.ratingCount && input.ratingCount > 0 && input.ratingAvg
            ? {
                  aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: input.ratingAvg,
                      reviewCount: input.ratingCount,
                      bestRating: 5,
                      worstRating: 1,
                  },
              }
            : {}),
    };
}

type BreadcrumbJsonLdItem = {
    name: string;
    url: string;
};

export function breadcrumbListJsonLd(items: BreadcrumbJsonLdItem[]) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

export type ItemListJsonLdItem = {
    name: string;
    url: string;
    image?: string | null;
};

export function itemListJsonLd(items: ItemListJsonLdItem[]) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
                "@type": "Product",
                name: item.name,
                url: item.url,
                ...(item.image ? { image: item.image } : {}),
            },
        })),
    };
}
