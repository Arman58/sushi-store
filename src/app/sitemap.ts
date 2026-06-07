import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    if (!SITE_URL) return [];

    const now = new Date();
    const baseUrl = SITE_URL;

    let categories: { slug: string }[] = [];
    try {
        categories = await prisma.category.findMany({
            where: {
                isActive: true,
                products: { some: { isActive: true } },
            },
            select: { slug: true },
            orderBy: { position: "asc" },
        });
    } catch (error) {
        console.error("[sitemap] Database unavailable:", error);
    }

    const staticPages: MetadataRoute.Sitemap = [
        {
            url: `${baseUrl}/`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 1.0,
        },
        {
            url: `${baseUrl}/menu`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/contacts`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/profile`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/offer`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.4,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.4,
        },
    ];

    const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
        url: `${baseUrl}/menu?category=${category.slug}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
    }));

    return [...staticPages, ...categoryPages];
}
