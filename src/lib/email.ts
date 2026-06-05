import { Resend } from "resend";

import { escapeHtml } from "@/lib/escape-html";

const resendApiKey = process.env.RESEND_API_KEY;

const DEV_FROM = "East West Delivery <onboarding@resend.dev>";

/** Ленивая инициализация — не падаем при сборке без ключа. */
function getResendClient(): Resend | null {
    if (!resendApiKey?.trim()) return null;
    return new Resend(resendApiKey);
}

function getSiteUrl(): string {
    const url =
        process.env.NEXTAUTH_URL ??
        process.env.NEXT_PUBLIC_SITE_URL ??
        "https://sushi-store.vercel.app";
    return url.replace(/\/$/, "");
}

/**
 * В development Resend принимает только onboarding@resend.dev как отправителя.
 * В production — RESEND_FROM (верифицированный домен), например no-reply@yourdomain.com.
 */
function getFromAddress(): string {
    if (process.env.NODE_ENV === "development") {
        return DEV_FROM;
    }
    return (
        process.env.RESEND_FROM?.trim() ??
        "East West Delivery <no-reply@eastwestdelivery.am>"
    );
}

/**
 * Resend в тестовом режиме доставляет письма только на email владельца аккаунта.
 * RESEND_DEV_REDIRECT_TO — inbox для локальной разработки (ваш email в Resend).
 */
function resolveRecipient(to: string): {
    recipient: string;
    devRedirectNote: string | null;
} {
    const redirect = process.env.RESEND_DEV_REDIRECT_TO?.trim().toLowerCase();
    const normalizedTo = to.trim().toLowerCase();

    if (
        process.env.NODE_ENV === "development" &&
        redirect &&
        normalizedTo !== redirect
    ) {
        return {
            recipient: redirect,
            devRedirectNote: `Тестовый режим Resend: письмо предназначалось для ${to}`,
        };
    }

    return { recipient: normalizedTo, devRedirectNote: null };
}

function buildWelcomeEmailHtml(
    name: string,
    siteUrl: string,
    devRedirectNote: string | null,
): string {
    const safeName = escapeHtml(name.trim() || "друг");
    const safeUrl = escapeHtml(siteUrl);
    const logoUrl = `${safeUrl}/east-west-logo.png`;
    const devBanner = devRedirectNote
        ? `<tr>
            <td style="padding:12px 28px;background:#FFF8E1;border-bottom:1px solid #FFE082;text-align:center;">
              <p style="margin:0;font-size:13px;color:#7A5C00;">${escapeHtml(devRedirectNote)}</p>
            </td>
          </tr>`
        : "";

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Добро пожаловать в East West Delivery</title>
</head>
<body style="margin:0;padding:0;background-color:#F6F4F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F6F4F1;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;border:1px solid #EBE7E3;overflow:hidden;">
          ${devBanner}
          <tr>
            <td style="padding:28px 28px 12px;text-align:center;background:linear-gradient(180deg,#F0FBF4 0%,#FFFFFF 100%);">
              <img src="${logoUrl}" alt="East West" width="72" height="72" style="display:block;margin:0 auto 16px;border-radius:12px;" />
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#00B341;">East West Delivery</p>
              <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:800;color:#1C1917;">Добро пожаловать!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;text-align:center;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:rgba(28,25,23,0.72);">
                Привет, ${safeName}! Рады видеть вас в <strong style="color:#1C1917;">East West Delivery</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:rgba(28,25,23,0.62);">
                Заказывайте суши, пиццу и любимые блюда с доставкой за 45–60 минут. История заказов сохраняется в личном кабинете.
              </p>
              <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;background:#00B341;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;border-radius:12px;">
                Перейти на сайт
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:#FBF9F7;border-top:1px solid #EBE7E3;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.45;color:rgba(28,25,23,0.45);">
                Если вы не регистрировались на сайте, просто проигнорируйте это письмо.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function formatResendError(
    message: string,
    from: string,
    intendedTo: string,
    actualTo: string,
): string {
    const sandboxHint =
        message.includes("only send testing emails to your own email")
            ? " Resend sandbox: добавьте RESEND_DEV_REDIRECT_TO в .env.local (email вашего аккаунта Resend) или верифицируйте домен на resend.com/domains."
            : "";
    return `[Resend] ${message} (from: ${from}, intended: ${intendedTo}, sent to: ${actualTo})${sandboxHint}`;
}

/**
 * Приветственное письмо после регистрации / повторная отправка из профиля.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
    const resend = getResendClient();
    if (!resend) {
        throw new Error("RESEND_API_KEY is not configured");
    }

    const siteUrl = getSiteUrl();
    const from = getFromAddress();
    const { recipient, devRedirectNote } = resolveRecipient(to);
    const html = buildWelcomeEmailHtml(name, siteUrl, devRedirectNote);

    const { data, error } = await resend.emails.send({
        from,
        to: [recipient],
        subject: "Добро пожаловать в East West Delivery!",
        html,
    });

    if (error) {
        throw new Error(
            formatResendError(error.message, from, to, recipient),
        );
    }

    console.info("[email] Welcome email sent:", {
        id: data?.id,
        intendedTo: to,
        sentTo: recipient,
        from,
        devRedirect: Boolean(devRedirectNote),
    });
}
