import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { getPathname } from "@/i18n/server";
import { getActiveProductBySlug } from "@/lib/product-by-slug";
import { absoluteProductImageUrl } from "@/lib/seo/absolute-image-url";
import { JsonLd, breadcrumbListJsonLd, productJsonLd } from "@/lib/seo/json-ld";
import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import { truncateMetaDescription } from "@/lib/seo/truncate-meta";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { PageContainer } from "@/shared/ui";
import { ProductPageView } from "@/widgets/product-page";

export const revalidate = 60;

type ProductPageProps = {
    params: Promise<{ slug: string; locale: string }>;
};

function getProductCoverUrlForMeta(product: {
    mainImage: string | null;
    images: unknown;
}): string | null {
    if (product.mainImage?.trim()) return product.mainImage;
    if (Array.isArray(product.images)) {
        const first = product.images.find(
            (item): item is string => typeof item === "string" && item.trim().length > 0,
        );
        return first ?? null;
    }
    return null;
}

export async function generateMetadata({
    params,
}: ProductPageProps): Promise<Metadata> {
    const { slug } = await params;
    const locale = await getLocale();
    const t = await getTranslations("metadata.product");

    const product = await getActiveProductBySlug(slug, locale);
    if (!product) {
        return { title: "404" };
    }

    const descriptionSource =
        product.description?.trim() ||
        product.composition?.trim() ||
        t("fallbackDescription", { name: product.name });

    const coverUrl = absoluteProductImageUrl(
        product.mainImage ?? getProductCoverUrlForMeta(product),
    );

    return buildLocalizedMetadata({
        locale,
        href: `/menu/${product.slug}`,
        title: `${product.name} | ${SITE_NAME}`,
        description: truncateMetaDescription(descriptionSource),
        titleAbsolute: true,
        openGraph: {
            title: `${product.name} | ${SITE_NAME}`,
            description: truncateMetaDescription(descriptionSource),
            image: coverUrl,
        },
    });
}

export default async function ProductPage({ params }: ProductPageProps) {
    const { slug, locale: routeLocale } = await params;
    const locale = routeLocale || (await getLocale());

    const product = await getActiveProductBySlug(slug, locale);
    if (!product) {
        notFound();
    }

    const tNav = await getTranslations("nav");

    const homePath = getPathname({ locale, href: "/" });
    const menuPath = getPathname({ locale, href: "/menu" });
    const categoryPath = product.category?.slug
        ? getPathname({
              locale,
              href: `/menu?category=${product.category.slug}`,
          })
        : null;
    const productPath = getPathname({
        locale,
        href: `/menu/${product.slug}`,
    });

    const homeUrl = `${SITE_URL}${homePath}`;
    const menuUrl = `${SITE_URL}${menuPath}`;
    const categoryUrl = categoryPath ? `${SITE_URL}${categoryPath}` : null;
    const productUrl = `${SITE_URL}${productPath}`;

    const imageUrl = absoluteProductImageUrl(
        product.mainImage ?? getProductCoverUrlForMeta(product),
    );

    const structured = productJsonLd({
        name: product.name,
        description: product.description ?? product.composition,
        image: imageUrl,
        price: product.price,
        url: productUrl,
    });

    const breadcrumbItems = [
        { name: tNav("home"), url: homeUrl },
        { name: tNav("menu"), url: menuUrl },
        ...(product.category && categoryUrl
            ? [{ name: product.category.name, url: categoryUrl }]
            : []),
        { name: product.name, url: productUrl },
    ];

    const breadcrumbs = {
        home: { label: tNav("home"), href: "/" },
        menu: { label: tNav("menu"), href: "/menu" },
        category: product.category
            ? {
                  label: product.category.name,
                  href: `/menu?category=${product.category.slug}`,
              }
            : undefined,
        current: product.name,
    };

    return (
        <>
            <JsonLd data={[structured, breadcrumbListJsonLd(breadcrumbItems)]} />
            <PageContainer>
                <ProductPageView
                    product={product}
                    locale={locale}
                    breadcrumbs={breadcrumbs}
                />
            </PageContainer>
        </>
    );
}
