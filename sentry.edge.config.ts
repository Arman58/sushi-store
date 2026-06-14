import * as Sentry from "@sentry/nextjs";

import { sentryEdgeOptions } from "./src/lib/sentry/options";

Sentry.init(sentryEdgeOptions);
