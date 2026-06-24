import {
    Body,
    Container,
    Head,
    Html,
    Preview,
    Section,
    Text,
} from "@react-email/components";

import type { AppLocale } from "@/i18n/routing";
import { CONTACT_PHONE_DISPLAY, SITE_NAME } from "@/lib/site-config";

const BRAND_GREEN = "#00B341";
const PAGE_BG = "#f6f9fc";
const TEXT_PRIMARY = "#1C1917";
const TEXT_MUTED = "#64748b";

type OtpEmailCopy = {
    preview: string;
    heading: string;
    body: string;
    codeLabel: string;
    footerLocation: string;
    footerDisclaimer: string;
    devBannerPrefix: string;
};

const COPY: Record<AppLocale, OtpEmailCopy> = {
    ru: {
        preview: "Код подтверждения East West Delivery",
        heading: "Подтвердите email",
        body: "Введите этот код в приложении, чтобы завершить регистрацию. Код действует 5 минут.",
        codeLabel: "Ваш код подтверждения",
        footerLocation: "Nor Hachn, Kotayk, Armenia",
        footerDisclaimer:
            "Если вы не регистрировались на сайте, просто проигнорируйте это письмо.",
        devBannerPrefix: "Тестовый режим Resend: письмо предназначалось для",
    },
    hy: {
        preview: "East West Delivery հաստատման կոդ",
        heading: "Հաստատեք email-ը",
        body: "Մուտքագրեք այս կոդը հավելվածում՝ գրանցումն ավարտելու համար։ Կոդը վավեր է 5 րոպե։",
        codeLabel: "Ձեր հաստատման կոդը",
        footerLocation: "Nor Hachn, Kotayk, Armenia",
        footerDisclaimer:
            "Եթե դուք չեք գրանցվել կայքում, պարզապես անտեսեք այս նամակը։",
        devBannerPrefix: "Resend թեստային ռեժիմ. նամակը նախատեսված էր",
    },
    en: {
        preview: "East West Delivery verification code",
        heading: "Confirm your email",
        body: "Enter this code in the app to complete registration. The code expires in 5 minutes.",
        codeLabel: "Your verification code",
        footerLocation: "Nor Hachn, Kotayk, Armenia",
        footerDisclaimer:
            "If you did not sign up on our website, you can safely ignore this email.",
        devBannerPrefix: "Resend test mode: this email was intended for",
    },
};

export type OtpEmailProps = {
    locale?: AppLocale;
    code: string;
    devRedirectNote?: string | null;
};

export function OtpEmail({
    locale = "hy",
    code,
    devRedirectNote = null,
}: OtpEmailProps) {
    const copy = COPY[locale] ?? COPY.hy;

    return (
        <Html lang={locale}>
            <Head />
            <Preview>{copy.preview}</Preview>
            <Body style={bodyStyle}>
                <Container style={outerContainerStyle}>
                    <Section style={cardStyle}>
                        {devRedirectNote ? (
                            <Section style={devBannerStyle}>
                                <Text style={devBannerTextStyle}>
                                    {copy.devBannerPrefix} {devRedirectNote}
                                </Text>
                            </Section>
                        ) : null}

                        <Section style={headerStyle}>
                            <Text style={logoStyle}>{SITE_NAME}</Text>
                            <Text style={headingStyle}>{copy.heading}</Text>
                        </Section>

                        <Section style={contentStyle}>
                            <Text style={paragraphStyle}>{copy.body}</Text>
                            <Text style={codeLabelStyle}>{copy.codeLabel}</Text>
                            <Text style={codeStyle}>{code}</Text>
                        </Section>

                        <Section style={footerStyle}>
                            <Text style={footerTextStyle}>
                                {CONTACT_PHONE_DISPLAY} · {copy.footerLocation}
                            </Text>
                            <Text style={footerDisclaimerStyle}>
                                {copy.footerDisclaimer}
                            </Text>
                        </Section>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

export default OtpEmail;

const bodyStyle = {
    margin: 0,
    padding: 0,
    backgroundColor: PAGE_BG,
    fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

const outerContainerStyle = {
    margin: "0 auto",
    padding: "32px 16px",
    maxWidth: "560px",
} as const;

const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
} as const;

const devBannerStyle = {
    backgroundColor: "#FFF8E1",
    borderBottom: "1px solid #FFE082",
    padding: "12px 24px",
} as const;

const devBannerTextStyle = {
    margin: 0,
    fontSize: "13px",
    lineHeight: "1.4",
    color: "#7A5C00",
    textAlign: "center" as const,
};

const headerStyle = {
    padding: "28px 28px 12px",
    textAlign: "center" as const,
    background: "linear-gradient(180deg, #F0FBF4 0%, #FFFFFF 100%)",
};

const logoStyle = {
    margin: "0 0 12px",
    fontSize: "22px",
    lineHeight: "1.2",
    fontWeight: 800,
    color: BRAND_GREEN,
    letterSpacing: "-0.02em",
};

const headingStyle = {
    margin: 0,
    fontSize: "24px",
    lineHeight: "1.3",
    fontWeight: 800,
    color: TEXT_PRIMARY,
};

const contentStyle = {
    padding: "8px 28px 28px",
    textAlign: "center" as const,
};

const paragraphStyle = {
    margin: "0 0 20px",
    fontSize: "16px",
    lineHeight: "1.6",
    color: "rgba(28, 25, 23, 0.72)",
};

const codeLabelStyle = {
    margin: "0 0 8px",
    fontSize: "13px",
    lineHeight: "1.4",
    color: TEXT_MUTED,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    fontWeight: 700,
};

const codeStyle = {
    margin: 0,
    fontSize: "36px",
    lineHeight: "1.1",
    fontWeight: 800,
    letterSpacing: "0.28em",
    color: BRAND_GREEN,
    fontVariantNumeric: "tabular-nums" as const,
};

const footerStyle = {
    padding: "20px 28px 24px",
    textAlign: "center" as const,
    borderTop: "1px solid #e2e8f0",
};

const footerTextStyle = {
    margin: "0 0 8px",
    fontSize: "12px",
    lineHeight: "1.5",
    color: TEXT_MUTED,
};

const footerDisclaimerStyle = {
    margin: 0,
    fontSize: "12px",
    lineHeight: "1.45",
    color: "rgba(100, 116, 139, 0.85)",
};
