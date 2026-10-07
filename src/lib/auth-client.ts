"use client";

import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Browser-side auth calls: sign in, sign up, start the demo, sign out. */
export const authClient = createAuthClient({
  plugins: [anonymousClient()],
});
