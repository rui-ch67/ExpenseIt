/**
 * Sign-in, powered by Better Auth.
 * - Email and password accounts.
 * - "Try the demo": an anonymous account, created in one click and filled
 *   with sample data, so visitors never have to sign up. Demo accounts are
 *   deleted after a day by the cleanup job (see cleanupDemoAccounts).
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";
import type { Database } from "@/infrastructure/db/client";
import { accounts, rateLimits, sessions, users, verifications } from "@/infrastructure/db/schema";

export interface AuthOptions {
  /** Runs once for every new account, demo or real. */
  readonly onUserCreated: (user: { id: string; isAnonymous?: boolean | null }) => Promise<void>;
  readonly secret?: string;
  readonly baseURL?: string;
  /** Defaults to on in production only, so local development isn't throttled. */
  readonly rateLimit?: boolean;
}

function trustedOrigins(): string[] {
  const vercelHosts = [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL];
  return vercelHosts.filter(Boolean).map((host) => `https://${host}`);
}

export function createAuth(db: Database, options: AuthOptions) {
  return betterAuth({
    appName: "ExpenseIt",
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: trustedOrigins(),
    database: drizzleAdapter(db, {
      provider: "pg",
      usePlural: true,
      schema: { users, sessions, accounts, verifications, rateLimits },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: {
      // Avoids a database round trip on every request for 5 minutes.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    rateLimit: {
      enabled: options.rateLimit ?? process.env.NODE_ENV === "production",
      // Serverless instances don't share memory, so limits live in Postgres.
      storage: "database",
      customRules: {
        // Each demo creates a seeded account, so cap them per visitor.
        "/sign-in/anonymous": { window: 60 * 60, max: 5 },
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60 * 60, max: 5 },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await options.onUserCreated(user as { id: string; isAnonymous?: boolean | null });
          },
        },
      },
    },
    plugins: [
      anonymous({
        emailDomainName: "demo.expenseit.invalid",
        generateName: () => "Demo visitor",
      }),
      // Must be last: lets server actions set the session cookie.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
