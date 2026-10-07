import "server-only";
import { getDb } from "@/infrastructure/db/client";
import { type Auth, createAuth } from "./auth";
import { getServices } from "./services";

let auth: Auth | undefined;

/** The app's Better Auth instance, created on first use. */
export function getAuth(): Auth {
  auth ??= createAuth(getDb(), {
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    onUserCreated: (user) => getServices().accountSetup.setUp(user),
  });
  return auth;
}
