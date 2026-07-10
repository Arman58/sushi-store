import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { menuCategoryPath } from "@/lib/menu-paths";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site-config";

// /profile намеренно отсутствует: приватная страница (robots.ts её запрещает).
const STATIC_PATHS = [
    "",
    "/menu",
    "/contacts",
    "/offer",
    "/privacy",
] as const;

function localizedPath(locale: string, path: string): string {
    const prefix =
        locale === routing.defaultLocale ? "" : `/${locale}`;
    return path === "" ? prefix || "/" : `${prefix}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    if (!SITE_URL) return [];

    const now = new Date();
    const baseUrl = SITE_URL;

    let categories: { slug: string }[] = [];
    let products: { slug: string; createdAt: Date }[] = [];
    try {
        [categories, products] = await Promise.all([
            prisma.category.findMany({
                where: {
                    isActive: true,
                    products: { some: { isActive: true } },
                },
                select: { slug: true },
                orderBy: { position: "asc" },
            }),
            prisma.product.findMany({
                where: { isActive: true },
                select: { slug: true, createdAt: true },
                orderBy: { id: "asc" },
            }),
        ]);
    } catch {
    }

    const staticPages: MetadataRoute.Sitemap = routing.locales.flatMap(
        (locale) =>
            STATIC_PATHS.map((path) => ({
                url: `${baseUrl}${localizedPath(locale, path)}`,
                lastModified: now,
                changeFrequency:
                    path === "" || path === "/menu"
                        ? ("daily" as const)
                        : ("monthly" as const),
                priority:
                    path === ""
                        ? 1.0
                        : path === "/menu"
                          ? 0.9
                          : path === "/contacts"
                            ? 0.8
                            : 0.4,
            })),
    );

    const categoryPages: MetadataRoute.Sitemap = routing.locales.flatMap(
        (locale) =>
            categories.map((category) => ({
                url: `${baseUrl}${localizedPath(locale, menuCategoryPath(category.slug))}`,
                lastModified: now,
                changeFrequency: "daily" as const,
                priority: 0.8,
            })),
    );

    const productPages: MetadataRoute.Sitemap = routing.locales.flatMap(
        (locale) =>
            products.map((product) => ({
                url: `${baseUrl}${localizedPath(locale, `/menu/${product.slug}`)}`,
                lastModified: product.createdAt,
                changeFrequency: "weekly" as const,
                priority: 0.7,
            })),
    );

    return [...staticPages, ...categoryPages, ...productPages];
}
