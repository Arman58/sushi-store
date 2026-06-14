import * as Sentry from "@sentry/nextjs";

import { sentryClientOptions } from "./options";

let clientInitialized = false;

export function initSentryClient(): void {
    if (clientInitialized) {
        return;
    }

    clientInitialized = true;
    Sentry.init(sentryClientOptions);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
