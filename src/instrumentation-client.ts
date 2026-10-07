import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

// Browser errors. NEXT_PUBLIC_VERCEL_ENV is "production" or "preview" on Vercel.
Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_VERCEL_ENV));
