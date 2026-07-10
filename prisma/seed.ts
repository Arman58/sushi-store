import { Prisma, PrismaClient } from "@prisma/client";

import { deliveryZonesData } from "./ensure-delivery-zones";
import { L } from "./localized-seed";
import { getProductI18n } from "./product-translations";

const prisma = new PrismaClient();

const IMG = {
    pizza: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
    sushi: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80",
    shawarma: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80",
    lahmajo: "https://images.unsplash.com/photo-1598514982901-ae62764ae75e?w=800&q=80",
    fries: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80",
    strips: "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&q=80",
    drinks: "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=800&q=80",
} as const;

type CategorySlug =
    | "pizza"
    | "sushi"
    | "shawarma"
    | "lahmajo"
    | "fries"
    | "strips"
    | "drinks";

type ProductSeed = {
    slug: string;
    price: number;
    weight: number;
    image: string;
    categorySlug: CategorySlug;
    name: string;
    description: string;
    composition: string;
};

const CATEGORIES: { slug: CategorySlug; name: ReturnType<typeof L>; position: number }[] =
    [
        { slug: "pizza", name: L("Пицца", "Պիցցա", "Pizza"), position: 0 },
        {
            slug: "sushi",
            name: L("Суши и роллы", "Սուշի և ռոլներ", "Sushi & Rolls"),
            position: 1,
        },
        { slug: "shawarma", name: L("Шаурма", "Շաուրմա", "Shawarma"), position: 2 },
        { slug: "lahmajo", name: L("Лахмаджо", "Լահմաջո", "Lahmajo"), position: 3 },
        {
            slug: "fries",
            name: L("Картофель фри", "Կարտոֆիլ ֆրի", "French Fries"),
            position: 4,
        },
        {
            slug: "strips",
            name: L("Стрипсы", "Սթրիփսներ", "Chicken Strips"),
            position: 5,
        },
        { slug: "drinks", name: L("Напитки", "Ըմպելիքներ", "Drinks"), position: 6 },
    ];

const productsData: ProductSeed[] = [
    // Пицца (7)
    {
        slug: "pepperoni",
        price: 5500,
        weight: 450,
        image: IMG.pizza,
        categorySlug: "pizza",
        name: "Пепперони",
        description: "Классическая пицца с острой колбасой пепперони и моцареллой.",
        composition: "Тесто, соус, моцарелла, пепперони",
    },
    {
        slug: "margarita",
        price: 5000,
        weight: 420,
        image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80",
        categorySlug: "pizza",
        name: "Маргарита",
        description: "Нежная пицца с томатами, моцареллой и базиликом.",
        composition: "Тесто, соус, моцарелла, томаты, базилик",
    },
    {
        slug: "four-cheese",
        price: 6200,
        weight: 430,
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
        categorySlug: "pizza",
        name: "4 сыра",
        description: "Сливочная пицца с четырьмя видами сыра.",
        composition: "Моцарелла, пармезан, дор блю, чеддер",
    },
    {
        slug: "hawaiian",
        price: 5800,
        weight: 440,
        image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80",
        categorySlug: "pizza",
        name: "Гавайская",
        description: "Ананас и ветчина в мягком тесте - семейный любимец.",
        composition: "Ветчина, ананас, моцарелла",
    },
    {
        slug: "myasnaya",
        price: 7200,
        weight: 500,
        image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&q=80",
        categorySlug: "pizza",
        name: "Мясная",
        description: "Сытная пицца с говядиной, курицей и ветчиной.",
        composition: "Говядина, курица, ветчина, моцарелла",
    },
    {
        slug: "chicken-mushroom",
        price: 5900,
        weight: 440,
        image: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=80",
        categorySlug: "pizza",
        name: "С курицей и грибами",
        description: "Куриное филе и шампиньоны на сливочной основе.",
        composition: "Курица, шампиньоны, моцарелла",
    },
    {
        slug: "vegetarian",
        price: 5400,
        weight: 400,
        image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800&q=80",
        categorySlug: "pizza",
        name: "Вегетарианская",
        description: "Свежие овощи и оливки на тонком тесте.",
        composition: "Перец, оливки, томаты, моцарелла",
    },

    // Суши и роллы (7)
    {
        slug: "philadelphia",
        price: 6500,
        weight: 250,
        image: IMG.sushi,
        categorySlug: "sushi",
        name: "Филадельфия",
        description: "Ролл с лососем и сливочным сыром.",
        composition: "Лосось, сливочный сыр, нори, рис",
    },
    {
        slug: "california",
        price: 5500,
        weight: 240,
        image: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&q=80",
        categorySlug: "sushi",
        name: "Калифорния",
        description: "Ролл с крабом, авокадо и огурцом в кунжуте.",
        composition: "Краб, авокадо, огурец, кунжут",
    },
    {
        slug: "dragon-roll",
        price: 7200,
        weight: 260,
        image: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800&q=80",
        categorySlug: "sushi",
        name: "Дракон",
        description: "Угорь, авокадо и соус унаги - сладкий насыщенный вкус.",
        composition: "Угорь, авокадо, рис, нори",
    },
    {
        slug: "ebi-roll",
        price: 6000,
        weight: 220,
        image: "https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&q=80",
        categorySlug: "sushi",
        name: "Эби ролл",
        description: "Тигровая креветка и авокадо в классическом стиле.",
        composition: "Креветка, авокадо, рис, нори",
    },
    {
        slug: "set-vostok",
        price: 12000,
        weight: 900,
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
        categorySlug: "sushi",
        name: 'Сет "Восток" 32 шт',
        description: "Большой сет: Филадельфия, Калифорния, Дракон и Эби.",
        composition: "4 вида роллов, 32 штуки",
    },
    {
        slug: "set-zapad",
        price: 9500,
        weight: 680,
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
        categorySlug: "sushi",
        name: 'Сет "Запад" 24 шт',
        description: "Сет из 24 штук: Калифорния, Тамаго и Каппа маки.",
        composition: "3 вида роллов, 24 штуки",
    },
    {
        slug: "sashimi-salmon",
        price: 4500,
        weight: 120,
        image: "https://images.unsplash.com/photo-1534256958597-1fe87b6a17b6?w=800&q=80",
        categorySlug: "sushi",
        name: "Сашими лосось",
        description: "Свежее филе лосося без риса.",
        composition: "Филе лосося",
    },

    // Шаурма (7)
    {
        slug: "classic-chicken",
        price: 1800,
        weight: 350,
        image: IMG.shawarma,
        categorySlug: "shawarma",
        name: "Классическая куриная",
        description: "Сочная курица, овощи и фирменный соус в лаваше.",
        composition: "Курица, лаваш, капуста, морковь, соус",
    },
    {
        slug: "spicy-chicken",
        price: 2000,
        weight: 350,
        image: "https://images.unsplash.com/photo-1561651188-d207bbec4ec3?w=800&q=80",
        categorySlug: "shawarma",
        name: "Острая куриная",
        description: "Курица с халапеньо и острым соусом.",
        composition: "Курица, халапеньо, острый соус",
    },
    {
        slug: "shawarma-beef",
        price: 2400,
        weight: 400,
        image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
        categorySlug: "shawarma",
        name: "Мясная (говядина)",
        description: "Нежная говядина с овощами и специями.",
        composition: "Говядина, овощи, специи, лаваш",
    },
    {
        slug: "shawarma-cheese",
        price: 2200,
        weight: 380,
        image: "https://images.unsplash.com/photo-1551782450-21344efb0a9b?w=800&q=80",
        categorySlug: "shawarma",
        name: "С сыром",
        description: "Курица с сулугуни и свежими овощами.",
        composition: "Курица, сулугуни, овощи",
    },
    {
        slug: "shawarma-falafel",
        price: 1700,
        weight: 320,
        image: "https://images.unsplash.com/photo-1529006557810-275b8360b5e5?w=800&q=80",
        categorySlug: "shawarma",
        name: "Фалафель",
        description: "Хрустящий фалафель с овощами и тахини.",
        composition: "Фалафель, овощи, тахини, лаваш",
    },
    {
        slug: "shawarma-mixed",
        price: 2300,
        weight: 390,
        image: IMG.shawarma,
        categorySlug: "shawarma",
        name: "Микс курица + говядина",
        description: "Комбо из курицы и говядины с фирменным соусом.",
        composition: "Курица, говядина, овощи, соус",
    },
    {
        slug: "shawarma-bbq",
        price: 2100,
        weight: 360,
        image: IMG.shawarma,
        categorySlug: "shawarma",
        name: "BBQ куриная",
        description: "Курица в дымном BBQ-соусе с хрустящим луком.",
        composition: "Курица, BBQ-соус, лук, лаваш",
    },

    // Лахмаджо (7)
    {
        slug: "lahmajo-classic",
        price: 2500,
        weight: 300,
        image: IMG.lahmajo,
        categorySlug: "lahmajo",
        name: "Классический",
        description: "Тонкое тесто с ароматным фаршем и специями.",
        composition: "Тесто, фарш, томаты, специи",
    },
    {
        slug: "lahmajo-spicy",
        price: 2700,
        weight: 300,
        image: IMG.lahmajo,
        categorySlug: "lahmajo",
        name: "Острый",
        description: "Лахмаджо с перцем чили и острыми специями.",
        composition: "Фарш, перец чili, специи",
    },
    {
        slug: "lahmajo-egg",
        price: 2800,
        weight: 320,
        image: IMG.lahmajo,
        categorySlug: "lahmajo",
        name: "С яйцом",
        description: "Лахмаджо с яйцом на верху - сытный вариант.",
        composition: "Фарш, яйцо, специи, тесто",
    },
    {
        slug: "lahmajo-mini",
        price: 1800,
        weight: 240,
        image: IMG.lahmajo,
        categorySlug: "lahmajo",
        name: "Мини (2 шт)",
        description: "Две мини-лахмаджо - удобно на перекус.",
        composition: "Тонкое тесто, фарш, специи",
    },
    {
        slug: "lahmajo-veggie",
        price: 2200,
        weight: 280,
        image: IMG.lahmajo,
        categorySlug: "lahmajo",
        name: "Овощной",
        description: "Лахмаджо с овощной начинкой без мяса.",
        composition: "Овощи, томаты, специи, тесто",
    },
    {
        slug: "lahmajo-combo",
        price: 3200,
        weight: 350,
        image: IMG.lahmajo,
        categorySlug: "lahmajo",
        name: "Комбо с таном",
        description: "Лахмаджо + армянский тан 0,5 л.",
        composition: "Лахмаджо, тан",
    },
    {
        slug: "lahmajo-family",
        price: 3500,
        weight: 550,
        image: IMG.lahmajo,
        categorySlug: "lahmajo",
        name: "Семейный XL",
        description: "Большой лахмаджо на компанию из 3–4 человек.",
        composition: "Фарш, тесто, специи",
    },

    // Картофель фри (7)
    {
        slug: "french-fries",
        price: 1200,
        weight: 150,
        image: IMG.fries,
        categorySlug: "fries",
        name: "Классический",
        description: "Золотистая хрустящая картошка с солью.",
        composition: "Картофель, масло, соль",
    },
    {
        slug: "fries-large",
        price: 1800,
        weight: 250,
        image: IMG.fries,
        categorySlug: "fries",
        name: "Большая порция",
        description: "Увеличенная порция картофеля фри.",
        composition: "Картофель, масло, соль",
    },
    {
        slug: "fries-cheese",
        price: 2200,
        weight: 200,
        image: IMG.fries,
        categorySlug: "fries",
        name: "С сыром",
        description: "Фри с расплавленным сыром чеддер.",
        composition: "Картофель, сыр чеддер",
    },
    {
        slug: "fries-spicy",
        price: 1500,
        weight: 160,
        image: IMG.fries,
        categorySlug: "fries",
        name: "Острый",
        description: "Картофель фри с острым перцем и паприкой.",
        composition: "Картофель, перец, папrika",
    },
    {
        slug: "fries-sweet",
        price: 2000,
        weight: 170,
        image: IMG.fries,
        categorySlug: "fries",
        name: "Из батата",
        description: "Хрустящий батат с лёгкой сладостью.",
        composition: "Батат, масло, соль",
    },
    {
        slug: "fries-combo",
        price: 1600,
        weight: 180,
        image: IMG.fries,
        categorySlug: "fries",
        name: "Комбо с соусом",
        description: "Фри + чесночный соус.",
        composition: "Картофель, чесночный соус",
    },
    {
        slug: "fries-wedges",
        price: 1700,
        weight: 190,
        image: IMG.fries,
        categorySlug: "fries",
        name: "Картофельные дольки",
        description: "Дольки картофеля с травами.",
        composition: "Картофель, травы, масло",
    },

    // Стрипсы (7)
    {
        slug: "strips-4",
        price: 2500,
        weight: 180,
        image: IMG.strips,
        categorySlug: "strips",
        name: "Стрипсы 4 шт",
        description: "Четыре полоски куриного филе в панировке.",
        composition: "Куриное филе, панировка",
    },
    {
        slug: "chicken-strips-6",
        price: 3500,
        weight: 260,
        image: IMG.strips,
        categorySlug: "strips",
        name: "Стрипсы 6 шт",
        description: "Шесть полосок куриного филе в панировке.",
        composition: "Куриное филе, панировка",
    },
    {
        slug: "chicken-strips-9",
        price: 4800,
        weight: 380,
        image: IMG.strips,
        categorySlug: "strips",
        name: "Стрипсы 9 шт",
        description: "Девять полосок - порция на компанию.",
        composition: "Куриное филе, панировка",
    },
    {
        slug: "strips-spicy",
        price: 3800,
        weight: 280,
        image: IMG.strips,
        categorySlug: "strips",
        name: "Острые стрипсы",
        description: "Стрипсы в острой панировке.",
        composition: "Курица, острые специи, панировка",
    },
    {
        slug: "strips-combo",
        price: 5200,
        weight: 420,
        image: IMG.strips,
        categorySlug: "strips",
        name: "Комбо стрипсы + фри",
        description: "6 стрипсов и порция картофеля фри.",
        composition: "Стрипсы, картофель фри",
    },
    {
        slug: "nuggets-9",
        price: 2800,
        weight: 220,
        image: "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=800&q=80",
        categorySlug: "strips",
        name: "Наггетсы 9 шт",
        description: "Девять куриных наггетсов в золотистой панировке.",
        composition: "Куриное мясо, панировка",
    },
    {
        slug: "tenders-box",
        price: 4500,
        weight: 400,
        image: IMG.strips,
        categorySlug: "strips",
        name: "Тендеры XL",
        description: "Большая коробка куриных тenderов с соусом.",
        composition: "Куриные тenderы, соус",
    },

    // Напитки (8)
    {
        slug: "cola-05",
        price: 600,
        weight: 500,
        image: IMG.drinks,
        categorySlug: "drinks",
        name: "Кола 0.5 л",
        description: "Coca-Cola 0,5 л - освежающая классика.",
        composition: "Coca-Cola",
    },
    {
        slug: "cola-1",
        price: 1000,
        weight: 1000,
        image: IMG.drinks,
        categorySlug: "drinks",
        name: "Кола 1 л",
        description: "Coca-Cola 1 л - на компанию.",
        composition: "Coca-Cola",
    },
    {
        slug: "tan-05",
        price: 500,
        weight: 500,
        image: "https://images.unsplash.com/photo-1544145945-f90425340c06?w=800&q=80",
        categorySlug: "drinks",
        name: "Тан 0.5 л",
        description: "Армянский тан 0,5 л - идеален к шaурme.",
        composition: "Тан",
    },
    {
        slug: "tan-1",
        price: 800,
        weight: 1000,
        image: "https://images.unsplash.com/photo-1544145945-f90425340c06?w=800&q=80",
        categorySlug: "drinks",
        name: "Тан 1 л",
        description: "Армянский тan 1 л.",
        composition: "Тан",
    },
    {
        slug: "lemonade-dushes",
        price: 800,
        weight: 500,
        image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80",
        categorySlug: "drinks",
        name: "Лимонад Дюшес",
        description: "Грушевый лимonad Дюшes.",
        composition: "Лимonad",
    },
    {
        slug: "water-05",
        price: 300,
        weight: 500,
        image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80",
        categorySlug: "drinks",
        name: "Вода 0.5 л",
        description: "Питьевая вода 0,5 л.",
        composition: "Вода",
    },
    {
        slug: "juice-orange",
        price: 900,
        weight: 500,
        image: IMG.drinks,
        categorySlug: "drinks",
        name: "Сок апельсин 0.5 л",
        description: "Натуральный апельсиновый сок.",
        composition: "Апельсиновый сок",
    },
    {
        slug: "ayran-05",
        price: 700,
        weight: 500,
        image: IMG.drinks,
        categorySlug: "drinks",
        name: "Айran 0.5 л",
        description: "Освежающий айran с солью.",
        composition: "Айran",
    },
];

const MOD_SIZE = L("Размер", "Չափս", "Size");
const MOD_SAUCE = L("Соус", "Սոուս", "Sauce");
const OPT_30 = L("30 см", "30 սմ", "30 cm");
const OPT_45 = L("45 см", "45 սմ", "45 cm");
const OPT_SMALL = L("Маленькая", "Փոքր", "Small");
const OPT_LARGE = L("Большая", "Մեծ", "Large");
const OPT_SPICY = L("Острая", "Սուր", "Spicy");
const OPT_GARLIC = L("Чесночная", "Սխտորով", "Garlic");

function TName(localizedObj: ReturnType<typeof L>) {
    return {
        create: ["hy", "ru", "en"].map(loc => ({ locale: loc, name: localizedObj[loc as keyof typeof localizedObj] || "" }))
    };
}

function TProduct(nameObj: ReturnType<typeof L>, descObj: ReturnType<typeof L>, compObj: ReturnType<typeof L>) {
    return {
        create: ["hy", "ru", "en"].map(loc => ({
            locale: loc,
            name: nameObj[loc as keyof typeof nameObj] || "",
            description: descObj[loc as keyof typeof descObj] || "",
            composition: compObj[loc as keyof typeof compObj] || "",
        }))
    };
}

function TZone(nameObj: ReturnType<typeof L>, descObj: ReturnType<typeof L> | string) {
    const descJson = typeof descObj === "string" ? { hy: "", ru: "", en: "" } : descObj;
    return {
        create: ["hy", "ru", "en"].map(loc => ({
            locale: loc,
            name: nameObj[loc as keyof typeof nameObj] || "",
            description: descJson[loc as keyof typeof descJson] || "",
        }))
    };
}

async function addPizzaSizeModifier(productId: number): Promise<void> {
    await prisma.modifierGroup.create({
        data: {
            productId,
            translations: TName(MOD_SIZE),
            required: true,
            maxChoices: 1,
            position: 0,
            modifiers: {
                create: [
                    { translations: TName(OPT_30), priceDelta: 0, position: 0 },
                    { translations: TName(OPT_45), priceDelta: 2000, position: 1 },
                ],
            },
        },
    });
}

async function addShawarmaModifiers(productId: number): Promise<void> {
    await prisma.modifierGroup.create({
        data: {
            productId,
            translations: TName(MOD_SIZE),
            required: true,
            maxChoices: 1,
            position: 0,
            modifiers: {
                create: [
                    { translations: TName(OPT_SMALL), priceDelta: 0, position: 0 },
                    { translations: TName(OPT_LARGE), priceDelta: 500, position: 1 },
                ],
            },
        },
    });

    await prisma.modifierGroup.create({
        data: {
            productId,
            translations: TName(MOD_SAUCE),
            required: false,
            maxChoices: 1,
            position: 1,
            modifiers: {
                create: [
                    { translations: TName(OPT_SPICY), priceDelta: 0, position: 0 },
                    { translations: TName(OPT_GARLIC), priceDelta: 0, position: 1 },
                ],
            },
        },
    });
}

async function main() {
    console.log("🌱 Seeding East West Delivery (50 products)…");

    if (productsData.length !== 50) {
        throw new Error(`Expected 50 products, got ${productsData.length}`);
    }

    const slugs = new Set<string>();
    for (const p of productsData) {
        if (slugs.has(p.slug)) {
            throw new Error(`Duplicate slug: ${p.slug}`);
        }
        slugs.add(p.slug);
    }

    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.modifier.deleteMany();
    await prisma.modifierGroup.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.promoCode.deleteMany();
    await prisma.deliveryZone.deleteMany();

    const categories = await Promise.all(
        CATEGORIES.map((c) =>
            prisma.category.create({
                data: {
                    translations: TName(c.name),
                    slug: c.slug,
                    position: c.position,
                    isActive: true,
                },
            }),
        ),
    );

    const categoryIdBySlug = Object.fromEntries(
        categories.map((c) => [c.slug, c.id] as const),
    ) as Record<CategorySlug, number>;

    let pizzaCount = 0;
    let shawarmaCount = 0;

    for (const p of productsData) {
        const i18n = getProductI18n(p.slug, {
            name: p.name,
            description: p.description,
            composition: p.composition,
        });
        const images = [p.image] as Prisma.InputJsonArray;

        const created = await prisma.product.create({
            data: {
                translations: TProduct(i18n.name, i18n.description, i18n.composition),
                slug: p.slug,
                price: p.price,
                weight: p.weight,
                images,
                mainImage: p.image,
                isActive: true,
                categoryId: categoryIdBySlug[p.categorySlug],
            },
        });

        if (p.categorySlug === "pizza") {
            await addPizzaSizeModifier(created.id);
            pizzaCount += 1;
        }
        if (p.categorySlug === "shawarma") {
            await addShawarmaModifiers(created.id);
            shawarmaCount += 1;
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

    for (const z of deliveryZonesData) {
        await prisma.deliveryZone.create({
            data: {
                translations: TZone(z.name, z.description),
                deliveryPrice: z.deliveryPrice,
                minOrderAmount: z.minOrderAmount,
                requiresManagerApproval: z.requiresManagerApproval,
                position: z.position,
                isActive: true,
            },
        });
    }

    console.log(`✅ Категорий: ${categories.length}`);
    console.log(`✅ Товаров: ${productsData.length}`);
    console.log(`✅ Пицц с модификатором «Размер»: ${pizzaCount}`);
    console.log(`✅ Шаурмы с модификаторами «Размер» + «Соус»: ${shawarmaCount}`);
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
