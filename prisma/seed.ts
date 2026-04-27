// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding East-West project...");

    // на всякий случай чистим (порядок важен из-за связей)
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    const categoriesData = [
        { slug: "sushi", name: "Суши и роллы" },
        { slug: "shawarma", name: "Шаурма" },
        { slug: "lahmajo", name: "Лахмаджо" },
        { slug: "pizza", name: "Пицца" },
        { slug: "snacks", name: "Стрипсы и фри" },
    ];

    const categories = await Promise.all(
        categoriesData.map((c) =>
            prisma.category.create({
                data: {
                    name: c.name,
                    slug: c.slug,
                },
            })
        )
    );

    // удобная мапа slug → id
    const categoryIdBySlug = Object.fromEntries(
        categories.map((c) => [c.slug, c.id] as const)
    );

    const productsData = [
        {
            name: "California Roll",
            slug: "california-roll",
            description: "Лосось, авокадо, огурец, нори, рис",
            price: 4500,
            weight: 220,
            image: "",
            categorySlug: "sushi",
        },
        {
            name: "Spicy Tuna Roll",
            slug: "spicy-tuna-roll",
            description: "Тунец, острый соус, нори, рис",
            price: 4800,
            weight: 230,
            image: "",
            categorySlug: "sushi",
        },
        {
            name: "Chicken Shawarma",
            slug: "chicken-shawarma",
            description: "Курица, соус, овощи, лаваш",
            price: 3200,
            weight: 300,
            image: "",
            categorySlug: "shawarma",
        },
        {
            name: "Lahmajo Classic",
            slug: "lahmajo-classic",
            description: "Тонкое тесто, фарш, специи",
            price: 2000,
            weight: 180,
            image: "",
            categorySlug: "lahmajo",
        },
        {
            name: "East-West Pizza",
            slug: "east-west-pizza",
            description: "Микс восточных специй и моцареллы",
            price: 6500,
            weight: 500,
            image: "",
            categorySlug: "pizza",
        },
        {
            name: "Chicken Strips",
            slug: "chicken-strips",
            description: "Хрустящие куриные стрипсы",
            price: 3500,
            weight: 250,
            image: "",
            categorySlug: "snacks",
        },
        {
            name: "French Fries",
            slug: "french-fries",
            description: "Классическая картошка фри",
            price: 1500,
            weight: 150,
            image: "",
            categorySlug: "snacks",
        },
    ];

    for (const p of productsData) {
        await prisma.product.create({
            data: {
                name: p.name,
                slug: p.slug,
                description: p.description,
                price: p.price,
                weight: p.weight,
                image: p.image || null,
                isActive: true,
                categoryId: categoryIdBySlug[p.categorySlug],
            },
        });
    }

    console.log("✅ Seeding completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seeding error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
