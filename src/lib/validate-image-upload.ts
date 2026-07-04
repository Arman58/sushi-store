const ALLOWED_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".heic",
    ".heif",
    ".avif",
] as const;

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/avif",
] as const;

/** Браузеры и iOS часто не выставляют MIME для HEIC/HEIF - доверяем whitelist расширения. */
const TRUSTED_EXTENSION_FALLBACK_MIMES = ["", "application/octet-stream"] as const;

export const IMAGE_UPLOAD_ACCEPT = ALLOWED_MIME_TYPES.join(",");

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

export type ImageUploadValidationError = "unsupported_image_format";

export type ImageUploadValidationResult =
    | { ok: true }
    | { ok: false; error: ImageUploadValidationError };

/**
 * Проверка расширения и MIME перед отправкой в Cloudinary.
 * MIME сверяется с whitelist; пустой или application/octet-stream допускается,
 * если расширение в whitelist (типично для HEIC с iPhone).
 */
function mimeMatchesOrTrustedExtension(mime: string, extension: string): boolean {
    if (isAllowedMimeType(mime)) return true;
    return (
        (TRUSTED_EXTENSION_FALLBACK_MIMES as readonly string[]).includes(mime) &&
        isAllowedExtension(extension)
    );
}

export function validateImageUpload(file: File): ImageUploadValidationResult {
    const extension = getFileExtension(file.name);
    if (!extension || !isAllowedExtension(extension)) {
        return { ok: false, error: "unsupported_image_format" };
    }

    const mime = file.type.trim().toLowerCase();
    if (!mimeMatchesOrTrustedExtension(mime, extension)) {
        return { ok: false, error: "unsupported_image_format" };
    }

    return { ok: true };
}
