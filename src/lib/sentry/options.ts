import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";

import { SENTRY_DENY_URLS, SENTRY_IGNORE_ERRORS, sentryBeforeSend } from "./filters";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

const tracesSampleRate =
    process.env.NODE_ENV === "production"
        ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1")
        : 1;

const sharedOptions = {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    ignoreErrors: SENTRY_IGNORE_ERRORS,
    denyUrls: SENTRY_DENY_URLS,
    beforeSend: sentryBeforeSend,
    tracesSampleRate,
} as const;

export const sentryClientOptions: BrowserOptions = {
    ...sharedOptions,
};

export const sentryServerOptions: NodeOptions = {
    ...sharedOptions,
};

export const sentryEdgeOptions: EdgeOptions = {
    ...sharedOptions,
};
