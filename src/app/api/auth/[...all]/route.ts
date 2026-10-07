import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth-instance";

// Better Auth serves every /api/auth/* endpoint (sign up, sign in, demo, sign out).
export const { GET, POST } = toNextJsHandler((request) => getAuth().handler(request));
