import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/sentry-options";

const options = sentryOptions(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN);

Sentry.init({
  ...options,
  // Prisma spans: shows which DB queries make a request slow (query values are not collected —
  // see dataCollection.databaseQueryData in sentry-options)
  integrations: [Sentry.prismaIntegration()],
});
