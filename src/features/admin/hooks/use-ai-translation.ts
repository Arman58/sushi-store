import { useTranslations } from "next-intl";
import { useState } from "react";

import { showAppToast } from "@/shared/lib/show-app-toast";

type TranslateErrorCode =
    | "config"
    | "timeout"
    | "upstream"
    | "invalid_response"
    | "unexpected";

function mapErrorCode(code: unknown): TranslateErrorCode | null {
    if (
        code === "config" ||
        code === "timeout" ||
        code === "upstream" ||
        code === "invalid_response" ||
        code === "unexpected"
    ) {
        return code;
    }
    return null;
}

export function useAITranslation() {
    const t = useTranslations("admin.aiTranslate");
    const [isTranslating, setIsTranslating] = useState(false);

    const translate = async (
        fields: Record<string, string>,
    ): Promise<{ en: Record<string, string>; hy: Record<string, string> } | null> => {
        const filteredFields = Object.fromEntries(
            Object.entries(fields).filter(([, val]) => val.trim().length > 0),
        );

        if (Object.keys(filteredFields).length === 0) {
            showAppToast(t("noText"), "error");
            return null;
        }

        setIsTranslating(true);
        try {
            const response = await fetch("/api/admin/translate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ fields: filteredFields }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const code = mapErrorCode(errData.code);
                if (code === "config") {
                    throw new Error(t("errorConfig"));
                }
                if (code === "timeout") {
                    throw new Error(t("errorTimeout"));
                }
                if (code === "upstream" || code === "invalid_response") {
                    throw new Error(t("errorUpstream"));
                }
                throw new Error(
                    typeof errData.error === "string"
                        ? errData.error
                        : t("errorGeneric"),
                );
            }

            const data = await response.json();
            showAppToast(t("success"));
            return data;
        } catch (error: unknown) {
            console.error("AI Translation Client Error:", error);
            const errMsg =
                error instanceof Error ? error.message : t("errorGeneric");
            showAppToast(errMsg, "error");
            return null;
        } finally {
            setIsTranslating(false);
        }
    };

    return {
        translate,
        isTranslating,
    };
}
