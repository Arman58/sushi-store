import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function safeBasename(name: string): string {
    const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
    return base.length > 0 ? base : "file";
}

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
    if (file.size === 0) {
        return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    const originalName = safeBasename(file.name);
    const filename = `${Date.now()}-${originalName}`;
    const destPath = path.join(UPLOAD_DIR, filename);

    try {
        await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (err) {
        console.error("upload mkdir", err);
        return NextResponse.json({ error: "Failed to create upload directory" }, { status: 500 });
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(destPath, buffer);
    } catch (err) {
        console.error("upload writeFile", err);
        return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
    }

    return NextResponse.json({ url: `/uploads/${filename}` });
}
