import {
    Body,
    Button,
    Container,
    Head,
    Hr,
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

type WelcomeEmailCopy = {
    preview: string;
    heading: string;
    body: string;
    cta: string;
    footerLocation: string;
    footerDisclaimer: string;
    devBannerPrefix: string;
};

const COPY: Record<AppLocale, WelcomeEmailCopy> = {
    ru: {
        preview: "Добро пожаловать в East West Delivery",
        heading: "Добро пожаловать в East West! 🍣",
        body: "Рады видеть вас в нашей семье доставки суши, пиццы и шаурмы. Ваш первый заказ уже ждет вас!",
        cta: "Перейти в меню",
        footerLocation: "Nor Hachn, Kotayk, Armenia",
        footerDisclaimer:
            "Если вы не регистрировались на сайте, просто проигнорируйте это письмо.",
        devBannerPrefix: "Тестовый режим Resend: письмо предназначалось для",
    },
    hy: {
        preview: "Բարի գալուստ East West Delivery",
        heading: "Բարի գալուստ East West! 🍣",
        body: "Ուրախ ենք, որ մեր սուշի, պիցցա և շաուրմա առաքման ընտանիքում եք։ Ձեր առաջին պատվերը արդեն սպասում է։",
        cta: "Դիտել մենյուն",
        footerLocation: "Nor Hachn, Kotayk, Armenia",
        footerDisclaimer:
            "Եթե դուք չեք գրանցվել կայքում, պարզապես անտեսեք այս նամակը։",
        devBannerPrefix: "Resend թեստային ռեժիմ. նամակը նախատեսված էր",
    },
    en: {
        preview: "Welcome to East West Delivery",
        heading: "Welcome to East West! 🍣",
        body: "We are glad to have you in our sushi, pizza and shawarma delivery family. Your first order is waiting for you!",
        cta: "Browse menu",
        footerLocation: "Nor Hachn, Kotayk, Armenia",
        footerDisclaimer:
            "If you did not sign up on our website, you can safely ignore this email.",
        devBannerPrefix: "Resend test mode: this email was intended for",
    },
};

export type WelcomeEmailProps = {
    locale?: AppLocale;
    menuUrl?: string;
    devRedirectNote?: string | null;
};

export function WelcomeEmail({
    locale = "hy",
    menuUrl = "https://eastwestnh.com/menu",
    devRedirectNote = null,
}: WelcomeEmailProps) {
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
                            <Button href={menuUrl} style={buttonStyle}>
                                {copy.cta}
                            </Button>
                        </Section>

                        <Hr style={hrStyle} />

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

export default WelcomeEmail;

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
    margin: "0 0 24px",
    fontSize: "16px",
    lineHeight: "1.6",
    color: "rgba(28, 25, 23, 0.72)",
};

const buttonStyle = {
    display: "inline-block",
    backgroundColor: BRAND_GREEN,
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 700,
    textDecoration: "none",
    borderRadius: "12px",
    padding: "14px 28px",
};

const hrStyle = {
    borderColor: "#e2e8f0",
    margin: 0,
};

const footerStyle = {
    padding: "20px 28px 24px",
    textAlign: "center" as const,
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
