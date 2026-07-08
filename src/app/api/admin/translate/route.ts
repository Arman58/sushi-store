import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody } from "@/lib/parse-json-body";
import { verifyAdmin } from "@/lib/verify-admin";

const translateRequestSchema = z.object({
    fields: z.record(z.string().min(1)),
});

export async function POST(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) return auth.response;

    const parsedBody = await parseJsonBody(request, translateRequestSchema);
    if (!parsedBody.ok) return parsedBody.response;

    const { fields } = parsedBody.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            {
                code: "config",
                error: "Google Gemini API key is not configured in the server environment variables.",
            },
            { status: 500 },
        );
    }

    const prompt = `You are a professional translator for a premium food delivery marketplace (specializing in sushi, rolls, pizza, salads, desserts, and drinks).
Translate the provided key-value object from Russian (source) to English ('en') and Armenian ('hy').
Return the translations as a raw JSON object with keys 'en' and 'hy', where each key contains the mapped translated values matching the input keys.

Guidelines:
1. Translate values naturally for a food delivery context. Maintain a high-end, organic, and appetizing tone.
2. Keep brand names (e.g. "Coca-Cola", "Fanta") unchanged.
3. Keep Japanese roll names in English (e.g., Philadelphia, California, Unagi, Dragon) rather than translating them literally. In Armenian, use their phonetic equivalents (e.g. "Ֆիլադելֆիա", "Կալիֆորնիա").
4. Keep HTML tags (e.g., <p>, <br />, <b>), emoji, carriage returns (\\n), size dimensions, and currency symbols (e.g. ֏, $, ₽) exactly unchanged.
5. Do not change numeric portion sizes, weight metrics, or piece counts.
6. Do not include markdown code blocks or explanations. Respond ONLY with a valid minified JSON object matching the requested schema.

Source JSON:
${JSON.stringify(fields, null, 2)}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt,
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        responseMimeType: "application/json",
                    },
                }),
                signal: controller.signal,
            },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errBody = await response.text().catch(() => "");
            console.error("Gemini API HTTP Error:", response.status, errBody);
            return NextResponse.json(
                {
                    code: "upstream",
                    error: `Gemini API returned an HTTP error status: ${response.status}`,
                },
                { status: 502 },
            );
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error("Gemini API response candidate content is empty:", data);
            return NextResponse.json(
                {
                    code: "invalid_response",
                    error: "Received an empty translation response from Gemini AI.",
                },
                { status: 502 },
            );
        }

        const result = JSON.parse(text.trim());

        if (typeof result !== "object" || !result.en || !result.hy) {
            console.error("Invalid translation schema returned by Gemini AI:", result);
            return NextResponse.json(
                {
                    code: "invalid_response",
                    error: "AI response did not match the required translation format.",
                },
                { status: 502 },
            );
        }

        return NextResponse.json({
            en: result.en,
            hy: result.hy,
        });
    } catch (error: unknown) {
        console.error("AI Translation Error:", error);
        if (error instanceof Error && error.name === "AbortError") {
            return NextResponse.json(
                {
                    code: "timeout",
                    error: "AI translation request timed out. Please try again.",
                },
                { status: 504 },
            );
        }
        return NextResponse.json(
            {
                code: "unexpected",
                error: "An unexpected error occurred while communicating with the translation service.",
            },
            { status: 500 },
        );
    }
}
