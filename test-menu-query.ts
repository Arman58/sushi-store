import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    try {
        const [categoriesRaw, productsRaw, priceStats] = await Promise.all([
            prisma.category.findMany({
                where: {
                    isActive: true,
                    products: { some: { isActive: true } },
                },
                orderBy: { position: "asc" },
                include: {
                    translations: true,
                    products: {
                        where: { isActive: true },
                        orderBy: { id: "asc" },
                        take: 1,
                        select: { mainImage: true, images: true },
                    },
                },
            }),
            prisma.product.findMany({
                where: { isActive: true },
                include: {
                    translations: true,
                    category: {
                        include: { translations: true }
                    },
                    modifierGroups: {
                        select: { id: true },
                        take: 1,
                    },
                },
                orderBy: { id: "asc" },
            }),
            prisma.product.aggregate({
                where: { isActive: true },
                _min: { price: true },
                _max: { price: true },
            }),
        ]);
        console.log("Success! Categories:", categoriesRaw.length, "Products:", productsRaw.length);
    } catch (e) {
        console.error("Error running query:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
