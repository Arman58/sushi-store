import { initSentryClient, onRouterTransitionStart } from "./lib/sentry/init-client";

initSentryClient();

export { onRouterTransitionStart };
