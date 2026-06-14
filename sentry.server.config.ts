import * as Sentry from "@sentry/nextjs";

import { sentryServerOptions } from "./src/lib/sentry/options";

Sentry.init(sentryServerOptions);
