import { Prisma, PrismaClient } from "@prisma/client";

import { deliveryZonesData } from "./ensure-delivery-zones";

const prisma = new PrismaClient();

type CategorySlug = "pizza" | "sushi" | "shawarma" | "snacks" | "drinks";

type ProductSeed = {
    name: string;
    /** Если не задан — генерируется через slugify(name). */
    slug?: string;
    description: string;
    composition: string;
    price: number;
    weight: number;
    image: string;
    categorySlug: CategorySlug;
};

const CYRILLIC_TO_LATIN: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "yo",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
};

/** Транслитерация кириллицы → латиница для slug. */
function transliterate(text: string): string {
    return text
        .toLowerCase()
        .split("")
        .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
        .join("");
}

/** slug из названия: транслит + нормализация. */
function slugify(name: string): string {
    return transliterate(name)
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const productsData: ProductSeed[] = [
    // ─── Пицца (8) ────────────────────────────────────────────────────────────
    {
        name: "Пепперони",
        slug: "pepperoni",
        description: "Классическая пицца с острой колбасой пепперони и расплавленной моцареллой.",
        composition: "Тесто, соус, моцарелла, пепперони",
        price: 4500,
        weight: 450,
        image: "https://images.unsplash.com/photo-1565299624946-b28f00a0ec4e?w=800&q=80",
        categorySlug: "pizza",
    },
    {
        name: "Маргарита",
        slug: "margarita",
        description: "Нежная пицца с томатами, моцареллой и базиликом — итальянская классика.",
        composition: "Тесто, соус, моцарелла, томаты",
        price: 4000,
        weight: 400,
        image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80",
        categorySlug: "pizza",
    },
    {
        name: "4 сыра",
        slug: "four-cheese",
        description: "Сливочная пицца с четырьмя видами сыра — насыщенный сырный вкус.",
        composition: "Моцарелла, пармезан, дор блю, чеддер",
        price: 5000,
        weight: 420,
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
        categorySlug: "pizza",
    },
    {
        name: "Гавайская",
        slug: "hawaiian",
        description: "Сладкий ананас и ветчина в мягком тесте — любимый семейный вариант.",
        composition: "Ветчина, ананас, моцарелла",
        price: 4800,
        weight: 430,
        image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80",
        categorySlug: "pizza",
    },
    {
        name: "Мясная",
        slug: "myasnaya",
        description: "Сытная пицца с говядиной, курицей и ветчиной — для большого аппетита.",
        composition: "Говядина, курица, ветчина",
        price: 5500,
        weight: 500,
        image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&q=80",
        categorySlug: "pizza",
    },
    {
        name: "С курицей и грибами",
        slug: "chicken-mushroom",
        description: "Нежное куриное филе и шампиньоны на сливочной основе.",
        composition: "Курица, шампиньоны",
        price: 4700,
        weight: 440,
        image: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=80",
        categorySlug: "pizza",
    },
    {
        name: "Вегетарианская",
        slug: "vegetarian",
        description: "Свежие овощи и оливки на тонком тесте — лёгкий и сбалансированный вариант.",
        composition: "Перец, оливки, томаты",
        price: 4200,
        weight: 400,
        image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800&q=80",
        categorySlug: "pizza",
    },
    {
        name: "Лахмаджо",
        slug: "lahmajo",
        description: "Тонкое тесто с ароматным фаршем и специями — армянская классика доставки.",
        composition: "Тонкое тесто, фарш, томаты, специи",
        price: 3500,
        weight: 300,
        image: "https://images.unsplash.com/photo-1565299507177-b0acbac7ea41?w=800&q=80",
        categorySlug: "pizza",
    },

    // ─── Суши и роллы (8) ─────────────────────────────────────────────────────
    {
        name: "Филадельфия",
        slug: "philadelphia",
        description: "Легендарный ролл с лососем и сливочным сыром.",
        composition: "Лосось, сливочный сыр, нори",
        price: 5500,
        weight: 250,
        image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=80",
        categorySlug: "sushi",
    },
    {
        name: "Калифорния",
        slug: "california",
        description: "Ролл с крабом, авокадо и огурцом в кунжуте.",
        composition: "Краб, авокадо, огурец, кунжут",
        price: 4500,
        weight: 240,
        image: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&q=80",
        categorySlug: "sushi",
    },
    {
        name: "Унаги ролл",
        slug: "unagi-roll",
        description: "Копчёный угорь с соусом унаги — сладкий и насыщенный вкус.",
        composition: "Угорь, соус унаги, кунжут",
        price: 5000,
        weight: 220,
        image: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800&q=80",
        categorySlug: "sushi",
    },
    {
        name: "Эби ролл",
        slug: "ebi-roll",
        description: "Тигровая креветка и авокадо в классическом японском стиле.",
        composition: "Тигровая креветка, авокадо",
        price: 4800,
        weight: 210,
        image: "https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&q=80",
        categorySlug: "sushi",
    },
    {
        name: 'Сет "Восток" 32 шт',
        slug: "set-vostok",
        description: "Большой сет из 32 штук: Филадельфия, Калифорния, Унаги и Эби.",
        composition: "Филадельфия, Калифорния, Унаги, Эби",
        price: 15000,
        weight: 900,
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
        categorySlug: "sushi",
    },
    {
        name: 'Сет "Запад" 24 шт',
        slug: "set-zapad",
        description: "Сет из 24 штук: Калифорния, Тамаго и Каппа маки.",
        composition: "Калифорния, Тамаго, Каппа маки",
        price: 12000,
        weight: 650,
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
        categorySlug: "sushi",
    },
    {
        name: "Онигири лосось",
        slug: "onigiri-salmon",
        description: "Японский рисовый треугольник с лососем — удобный перекус.",
        composition: "Рис, лосось, нори",
        price: 1500,
        weight: 120,
        image: "https://images.unsplash.com/photo-1590301157890-4810edc726a6?w=800&q=80",
        categorySlug: "sushi",
    },
    {
        name: "Сашими лосось",
        slug: "sashimi-salmon",
        description: "Свежее филе лосося без риса — для ценителей чистого вкуса рыбы.",
        composition: "Филе лосося",
        price: 4000,
        weight: 100,
        image: "https://images.unsplash.com/photo-1534256958597-1fe87b6a17b6?w=800&q=80",
        categorySlug: "sushi",
    },

    // ─── Шаурма (4) ───────────────────────────────────────────────────────────
    {
        name: "Классическая куриная",
        slug: "classic-chicken",
        description: "Сочная курица, свежие овощи и фирменный соус в тёплом лаваше.",
        composition: "Курица, лаваш, капуста, морковь, соус",
        price: 2500,
        weight: 350,
        image: "https://images.unsplash.com/photo-1561651188-d207bbec4ec3?w=800&q=80",
        categorySlug: "shawarma",
    },
    {
        name: "Острая куриная",
        slug: "spicy-chicken",
        description: "Курица с халапеньо и острым соусом — для любителей пикантного.",
        composition: "Курица, халапеньо, острый соус",
        price: 2700,
        weight: 350,
        image: "https://images.unsplash.com/photo-1529006557810-275b8360b5e5?w=800&q=80",
        categorySlug: "shawarma",
    },
    {
        name: "С сыром",
        slug: "shawarma-cheese",
        description: "Курица с расплавленным сулугуни и свежими овощами.",
        composition: "Курица, сулугуни, овощи",
        price: 3000,
        weight: 380,
        image: "https://images.unsplash.com/photo-1551782450-21344efb0a9b?w=800&q=80",
        categorySlug: "shawarma",
    },
    {
        name: "Мясная (Говядина)",
        slug: "shawarma-beef",
        description: "Нежная говядина с овощами и специями в ароматном лаваше.",
        composition: "Говядина, овощи, специи",
        price: 3500,
        weight: 400,
        image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
        categorySlug: "shawarma",
    },

    // ─── Закуски (6) ──────────────────────────────────────────────────────────
    {
        name: "Картофель фри",
        slug: "french-fries",
        description: "Золотистая хрустящая картошка — идеальное дополнение к любому заказу.",
        composition: "Картофель, масло, соль",
        price: 1500,
        weight: 150,
        image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80",
        categorySlug: "snacks",
    },
    {
        name: "Стрипсы 6 шт",
        slug: "chicken-strips-6",
        description: "Шесть полосок куриного филе в хрустящей панировке.",
        composition: "Филе курочки в панировке",
        price: 2500,
        weight: 200,
        image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&q=80",
        categorySlug: "snacks",
    },
    {
        name: "Стрипсы 9 шт",
        slug: "chicken-strips-9",
        description: "Девять полосок куриного филе в панировке — порция на компанию.",
        composition: "Филе курочки в панировке",
        price: 3500,
        weight: 300,
        image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&q=80",
        categorySlug: "snacks",
    },
    {
        name: "Наггетсы 9 шт",
        slug: "nuggets-9",
        description: "Девять куриных наггетсов в золотистой панировке.",
        composition: "Куриные наггетсы",
        price: 2500,
        weight: 200,
        image: "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=800&q=80",
        categorySlug: "snacks",
    },
    {
        name: "Луковые кольца",
        slug: "onion-rings",
        description: "Хрустящие кольца лука в кляре — классика к шаурме и пицце.",
        composition: "Лук в кляре",
        price: 1800,
        weight: 180,
        image: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80",
        categorySlug: "snacks",
    },
    {
        name: "Соус чесночный",
        slug: "garlic-sauce",
        description: "Ароматный чесночный соус с зеленью — к картофелю и стрипсам.",
        composition: "Чеснок, майонез, зелень",
        price: 300,
        weight: 50,
        image: "https://images.unsplash.com/photo-1472476443507-c7a594877720?w=800&q=80",
        categorySlug: "snacks",
    },

    // ─── Напитки (6) ──────────────────────────────────────────────────────────
    {
        name: "Кола 0.5 л",
        slug: "cola-05",
        description: "Coca-Cola 0,5 л — освежающая классика к любому блюду.",
        composition: "Coca-Cola",
        price: 600,
        weight: 500,
        image: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&q=80",
        categorySlug: "drinks",
    },
    {
        name: "Кола 1 л",
        slug: "cola-1",
        description: "Coca-Cola 1 л — большая бутылка на компанию.",
        composition: "Coca-Cola",
        price: 1000,
        weight: 1000,
        image: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&q=80",
        categorySlug: "drinks",
    },
    {
        name: "Тан 0.5 л",
        slug: "tan-05",
        description: "Армянский тан 0,5 л — идеален к шаурме и пицце.",
        composition: "Армянский тан",
        price: 500,
        weight: 500,
        image: "https://images.unsplash.com/photo-1544145945-f90425340c06?w=800&q=80",
        categorySlug: "drinks",
    },
    {
        name: "Тан 1 л",
        slug: "tan-1",
        description: "Армянский тан 1 л — большая порция кисломолочного напитка.",
        composition: "Армянский тан",
        price: 800,
        weight: 1000,
        image: "https://images.unsplash.com/photo-1544145945-f90425340c06?w=800&q=80",
        categorySlug: "drinks",
    },
    {
        name: "Лимонад Дюшес",
        slug: "lemonade-dushes",
        description: "Грушевый лимонад Дюшес — знакомый вкус из детства.",
        composition: "Лимонад Дюшес",
        price: 800,
        weight: 500,
        image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80",
        categorySlug: "drinks",
    },
    {
        name: "Вода Аква 0.5 л",
        slug: "water-05",
        description: "Питьевая вода 0,5 л — чистая и освежающая.",
        composition: "Питьевая вода",
        price: 300,
        weight: 500,
        image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80",
        categorySlug: "drinks",
    },
];

/** Пиццы с модификатором «Размер»: 30 см (0 ֏) / 45 см (+2000 ֏). */
const PIZZA_SIZE_MODIFIER_SLUGS = new Set([
    "pepperoni",
    "four-cheese",
    "myasnaya",
]);

async function addSizeModifier(productId: number): Promise<void> {
    await prisma.modifierGroup.create({
        data: {
            productId,
            name: "Размер",
            required: true,
            maxChoices: 1,
            position: 0,
            modifiers: {
                create: [
                    { name: "30 см", priceDelta: 0, position: 0 },
                    { name: "45 см", priceDelta: 2000, position: 1 },
                ],
            },
        },
    });
}

async function main() {
    console.log("🌱 Seeding East West Delivery…");

    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.modifier.deleteMany();
    await prisma.modifierGroup.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.promoCode.deleteMany();
    await prisma.deliveryZone.deleteMany();

    const categoriesData = [
        { slug: "pizza", name: "Пицца" },
        { slug: "sushi", name: "Суши и роллы" },
        { slug: "shawarma", name: "Шаурма" },
        { slug: "snacks", name: "Закуски" },
        { slug: "drinks", name: "Напитки" },
    ] as const;

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
    ) as Record<(typeof categoriesData)[number]["slug"], number>;

    if (productsData.length !== 32) {
        throw new Error(`Expected 32 products, got ${productsData.length}`);
    }

    const seenSlugs = new Set<string>();
    for (const p of productsData) {
        const slug = p.slug ?? slugify(p.name);
        if (seenSlugs.has(slug)) {
            throw new Error(`Duplicate product slug: ${slug}`);
        }
        seenSlugs.add(slug);
    }

    const productIdBySlug = new Map<string, number>();

    for (const p of productsData) {
        const slug = p.slug ?? slugify(p.name);
        const images = [p.image] as Prisma.InputJsonArray;
        const created = await prisma.product.create({
            data: {
                name: p.name,
                slug,
                description: p.description,
                composition: p.composition,
                price: p.price,
                weight: p.weight,
                images,
                mainImage: p.image,
                isActive: true,
                categoryId: categoryIdBySlug[p.categorySlug],
            },
        });
        productIdBySlug.set(slug, created.id);
    }

    for (const slug of PIZZA_SIZE_MODIFIER_SLUGS) {
        const productId = productIdBySlug.get(slug);
        if (productId != null) {
            await addSizeModifier(productId);
        }
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
        data: deliveryZonesData.map((z) => ({
            ...z,
            isActive: true,
        })),
    });

    console.log(`✅ Категорий: ${categories.length}`);
    console.log(`✅ Товаров: ${productsData.length}`);
    console.log(`✅ Пицц с модификатором «Размер»: ${PIZZA_SIZE_MODIFIER_SLUGS.size}`);
    console.log(`✅ Зоны доставки: ${deliveryZonesData.length}`);
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
