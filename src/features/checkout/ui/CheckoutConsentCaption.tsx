"use client";

import MuiLink from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { Link as I18nLink } from "@/i18n/server";

export function CheckoutConsentCaption() {
    const t = useTranslations("checkout.consent");

    return (
        <Typography
            variant="caption"
            color="text.secondary"
            align="center"
            sx={{ mt: 1, display: "block", lineHeight: 1.45 }}
        >
            {t.rich("caption", {
                offer: (chunks) => (
                    <MuiLink
                        component={I18nLink}
                        href="/offer"
                        target="_blank"
                        rel="noopener noreferrer"
                        color="primary"
                    >
                        {chunks}
                    </MuiLink>
                ),
                privacy: (chunks) => (
                    <MuiLink
                        component={I18nLink}
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        color="primary"
                    >
                        {chunks}
                    </MuiLink>
                ),
            })}
        </Typography>
    );
}
