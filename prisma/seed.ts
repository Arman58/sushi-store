// prisma/seed.ts
import { PrismaClient, Prisma } from "@prisma/client";

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
            description: "Классический ролл с лососем и авокадо",
            composition:
                "Рис для суши, нори, лосось слабосолёный, авокадо, огурец, кунжут, соевый соус",
            price: 4500,
            weight: 220,
            images: [
                "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=500&h=500&fit=crop",
            ] as Prisma.InputJsonArray,
            categorySlug: "sushi",
        },
        {
            name: "Spicy Tuna Roll",
            slug: "spicy-tuna-roll",
            description: "Острый ролл с тунцом",
            composition:
                "Рис, нори, тунец, острый майонезный соус, зелёный лук, соус шрирача",
            price: 4800,
            weight: 230,
            images: [
                "https://images.unsplash.com/photo-1611143669185-af2241765c1a?w=500&h=500&fit=crop",
            ] as Prisma.InputJsonArray,
            categorySlug: "sushi",
        },
        {
            name: "Chicken Shawarma",
            slug: "chicken-shawarma",
            description: "Курица, соус, овощи, лаваш",
            composition:
                "Куриное филе гриль, лаваш пшеничный, чесночный соус, томаты, огурцы, капуста, зелень",
            price: 3200,
            weight: 300,
            images: [
                "https://images.unsplash.com/photo-1561651821-34c3462e85cc?w=500&h=500&fit=crop",
            ] as Prisma.InputJsonArray,
            categorySlug: "shawarma",
        },
        {
            name: "Lahmajo Classic",
            slug: "lahmajo-classic",
            description: "Тонкое тесто, фарш, специи",
            composition:
                "Тонкое тесто, говяжий фарш, помидоры, лук, паприка, чеснок, зира, мята",
            price: 2000,
            weight: 180,
            images: [
                "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=500&fit=crop",
            ] as Prisma.InputJsonArray,
            categorySlug: "lahmajo",
        },
        {
            name: "East-West Pizza",
            slug: "east-west-pizza",
            description: "Микс восточных специй и моцареллы",
            composition:
                "Тесто, моцарелла, томатный соус, ветчина, ананасы, паприка, орегано",
            price: 6500,
            weight: 500,
            images: [
                "https://images.unsplash.com/photo-1513104890138-7c749f3fd1e2?w=500&h=500&fit=crop",
            ] as Prisma.InputJsonArray,
            categorySlug: "pizza",
        },
        {
            name: "Chicken Strips",
            slug: "chicken-strips",
            description: "Хрустящие куриные стрипсы",
            composition:
                "Куриное филе в панировке, яйцо, мука, специи, обжарка во фритюре",
            price: 3500,
            weight: 250,
            images: [
                "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&h=500&fit=crop",
            ] as Prisma.InputJsonArray,
            categorySlug: "snacks",
        },
        {
            name: "French Fries",
            slug: "french-fries",
            description: "Классическая картошка фри",
            composition:
                "Картофель, растительное масло, соль",
            price: 1500,
            weight: 150,
            images: [
                "https://images.unsplash.com/photo-1573080496219-bb080dd4d9d8?w=500&h=500&fit=crop",
            ] as Prisma.InputJsonArray,
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
                images: p.images,
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
