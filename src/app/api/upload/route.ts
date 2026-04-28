import { v2 } from "cloudinary";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

v2.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function POST(request: Request) {
    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json(
            { error: "Invalid or empty multipart body" },
            { status: 400 },
        );
    }

    const entry = formData.get("file");
    if (!entry) {
        return NextResponse.json({ error: "No file: expected form field 'file'" }, { status: 400 });
    }
    if (typeof entry === "string" || !("arrayBuffer" in entry)) {
        return NextResponse.json({ error: "Invalid file: expected a file upload" }, { status: 400 });
    }
    const file = entry as File;
    if (!file.size || file.size === 0) {
        return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
        return NextResponse.json(
            { error: "Файл слишком большой (макс 5 МБ)" },
            { status: 413 },
        );
    }

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
            v2.uploader
                .upload_stream({ folder: "east-west-products" }, (error, uploadResult) => {
                    if (error) {
                        reject(error);
                    } else if (uploadResult?.secure_url) {
                        resolve({ secure_url: uploadResult.secure_url });
                    } else {
                        reject(new Error("No URL from Cloudinary"));
                    }
                })
                .end(buffer);
        });

        return NextResponse.json({ url: result.secure_url });
    } catch (err) {
        console.error("cloudinary upload", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Upload failed" },
            { status: 500 },
        );
    }
}
