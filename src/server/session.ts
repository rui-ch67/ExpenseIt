import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "./auth-instance";

export interface CurrentUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  /** True for "Try the demo" accounts. */
  readonly isDemo: boolean;
}

/** The signed-in user, or null. Cached for the duration of one request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isDemo: Boolean((user as { isAnonymous?: boolean | null }).isAnonymous),
  };
});

/** Use at the top of every protected page and server action. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}
