import { permanentRedirect } from "next/navigation";

/** Accounts are created by signing in with Google, so the old address goes there. */
export default function SignUpPage() {
  permanentRedirect("/sign-in");
}
