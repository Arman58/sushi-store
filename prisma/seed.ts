import { Prisma, PrismaClient } from "@prisma/client";

import { REAL_ARMENIA_ZONES } from "./ensure-delivery-zones";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding East West Delivery…");

    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.deliveryZone.deleteMany();
    await prisma.promoCode.deleteMany();

    const categoriesData = [
        { slug: "pizza", name: "Пицца" },
        { slug: "sushi", name: "Суши и роллы" },
        { slug: "shawarma", name: "Шаурма" },
        { slug: "drinks", name: "Напитки" },
        { slug: "snacks", name: "Закуски" },
    ];

    const categories = await Promise.all(
        categoriesData.map((c, position) =>
            prisma.category.create({
                data: {
                    name: c.name,
                    slug: c.slug,
                    position,
                    isActive: true,
                },
            }),
        ),
    );

    const categoryIdBySlug = Object.fromEntries(
        categories.map((c) => [c.slug, c.id] as const),
    );

    /** Без внешних URL — обложки через локальный плейсхолдер на витрине. */
    const emptyImages = [] as Prisma.InputJsonArray;
    const noMainImage = null;

    const productsData: Array<{
        name: string;
        slug: string;
        description: string;
        composition: string;
        price: number;
        weight: number;
        categorySlug: string;
    }> = [
        {
            name: "Пепперони",
            slug: "pepperoni",
            description: "Классическая пицца с пепперони и моцареллой",
            composition: "Тесто, томатный соус, моцарелла, пепперони, орегано",
            price: 5800,
            weight: 520,
            categorySlug: "pizza",
        },
        {
            name: "Маргарита",
            slug: "margarita",
            description: "Томатный соус, моцарелла, базилик",
            composition: "Тесто, томатный соус, моцарелла, свежий базилик",
            price: 5200,
            weight: 480,
            categorySlug: "pizza",
        },
        {
            name: "Четыре сыра",
            slug: "four-cheese",
            description: "Микс сыров на тонком тесте",
            composition: "Тесто, сливочный соус, моцарелла, горгонзола, пармезан, чеддер",
            price: 6200,
            weight: 500,
            categorySlug: "pizza",
        },
        {
            name: "Филадельфия",
            slug: "philadelphia",
            description: "Ролл с лососем и сливочным сыром",
            composition: "Рис, нори, лосось, сливочный сыр, огурец",
            price: 4900,
            weight: 240,
            categorySlug: "sushi",
        },
        {
            name: "Калифорния",
            slug: "california",
            description: "Ролл с крабом и авокадо",
            composition: "Рис, нори, краб, авокадо, огурец, кунжут",
            price: 4500,
            weight: 220,
            categorySlug: "sushi",
        },
        {
            name: "Дракон",
            slug: "dragon-roll",
            description: "Запечённый ролл с угрём и соусом",
            composition: "Рис, нори, угорь, авокадо, соус унаги, кунжут",
            price: 5500,
            weight: 260,
            categorySlug: "sushi",
        },
        {
            name: "Классическая шаурма",
            slug: "shawarma-classic",
            description: "Курица, овощи, чесночный соус в лаваше",
            composition: "Куриное филе, лаваш, томаты, огурцы, капуста, чесночный соус",
            price: 3200,
            weight: 320,
            categorySlug: "shawarma",
        },
        {
            name: "Острая шаурма",
            slug: "shawarma-spicy",
            description: "Курица со спайси-соусом",
            composition: "Куриное филе, лаваш, овощи, соус спайси, зелень",
            price: 3400,
            weight: 330,
            categorySlug: "shawarma",
        },
        {
            name: "Coca-Cola 0,5 л",
            slug: "coca-cola-05",
            description: "Газированный напиток",
            composition: "Coca-Cola, 0,5 л",
            price: 600,
            weight: 500,
            categorySlug: "drinks",
        },
        {
            name: "Jermuk 0,5 л",
            slug: "jermuk-05",
            description: "Минеральная вода",
            composition: "Jermuk, стекло 0,5 л",
            price: 500,
            weight: 500,
            categorySlug: "drinks",
        },
        {
            name: "Айран 0,3 л",
            slug: "ayran-03",
            description: "Кисломолочный напиток",
            composition: "Айран, 0,3 л",
            price: 400,
            weight: 300,
            categorySlug: "drinks",
        },
        {
            name: "Картофель фри",
            slug: "french-fries",
            description: "Хрустящая картошка фри",
            composition: "Картофель, масло, соль",
            price: 1500,
            weight: 150,
            categorySlug: "snacks",
        },
        {
            name: "Крылья BBQ",
            slug: "bbq-wings",
            description: "Куриные крылья в соусе BBQ",
            composition: "Куриные крылья, соус BBQ, специи",
            price: 3800,
            weight: 280,
            categorySlug: "snacks",
        },
        {
            name: "Наггетсы",
            slug: "chicken-nuggets",
            description: "Куриные наггетсы с соусом",
            composition: "Куриное филе в панировке, соус на выбор",
            price: 2900,
            weight: 200,
            categorySlug: "snacks",
        },
    ];

    for (const p of productsData) {
        await prisma.product.create({
            data: {
                name: p.name,
                slug: p.slug,
                description: p.description,
                composition: p.composition,
                price: p.price,
                weight: p.weight,
                images: emptyImages,
                mainImage: noMainImage,
                isActive: true,
                categoryId: categoryIdBySlug[p.categorySlug],
            },
        });
    }

    const pepperoni = await prisma.product.findUnique({
        where: { slug: "pepperoni" },
    });
    if (pepperoni) {
        await prisma.modifierGroup.create({
            data: {
                productId: pepperoni.id,
                name: "Размер",
                required: true,
                maxChoices: 1,
                position: 0,
                modifiers: {
                    create: [
                        { name: "30 см", priceDelta: 0, position: 0 },
                        { name: "45 см", priceDelta: 300, position: 1 },
                    ],
                },
            },
        });
        await prisma.modifierGroup.create({
            data: {
                productId: pepperoni.id,
                name: "Тесто",
                required: true,
                maxChoices: 1,
                position: 1,
                modifiers: {
                    create: [
                        { name: "Тонкое", priceDelta: 0, position: 0 },
                        { name: "Пышное", priceDelta: 0, position: 1 },
                    ],
                },
            },
        });
    }

    await prisma.promoCode.create({
        data: {
            code: "WELCOME",
            discountType: "PERCENTAGE",
            discountValue: 10,
            isActive: true,
        },
    });

    await prisma.deliveryZone.createMany({
        data: REAL_ARMENIA_ZONES.map((z) => ({ ...z })),
    });
    console.log(`✅ Зоны доставки: ${REAL_ARMENIA_ZONES.length}`);

    console.log("✅ Seeding completed.");
}

main()
    .catch((e) => {
        console.error("❌ Seeding error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
