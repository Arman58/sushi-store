const ALLOWED_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
] as const;

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
] as const;

type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

function getFileExtension(filename: string): string {
    const trimmed = filename.trim().toLowerCase();
    const lastDot = trimmed.lastIndexOf(".");
    if (lastDot < 0) return "";
    return trimmed.slice(lastDot);
}

function isAllowedExtension(ext: string): ext is AllowedExtension {
    return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

function isAllowedMimeType(mime: string): mime is AllowedMimeType {
    return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export type ImageUploadValidationResult =
    | { ok: true }
    | { ok: false; error: "Invalid file type" };

/**
 * Строгая проверка расширения и MIME перед отправкой в Cloudinary.
 * Оба условия обязательны — клиентский file.type нельзя доверять без whitelist.
 */
export function validateImageUpload(file: File): ImageUploadValidationResult {
    const extension = getFileExtension(file.name);
    if (!extension || !isAllowedExtension(extension)) {
        return { ok: false, error: "Invalid file type" };
    }

    const mime = file.type.trim().toLowerCase();
    if (!mime || !isAllowedMimeType(mime)) {
        return { ok: false, error: "Invalid file type" };
    }

    return { ok: true };
}
