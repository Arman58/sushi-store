/** Обрезка текста для meta description (SEO). */
export function truncateMetaDescription(text: string, maxLength = 150): string {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) return normalized;
    const slice = normalized.slice(0, maxLength - 1);
    const lastSpace = slice.lastIndexOf(" ");
    const cut = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice;
    return `${cut.trim()}…`;
}
