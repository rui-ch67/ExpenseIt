import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { AuthPage } from "@/ui/auth-page";
import { GoogleSignIn } from "@/ui/google-sign-in";

export const metadata = { title: "Sign in" };

/** What to say when Google sends the visitor back with an error code. */
function problemFor(error: string | string[] | undefined): string | null {
  if (!error) return null;
  return error === "access_denied"
    ? "Google sign-in was cancelled. Try again whenever you're ready."
    : "Google sign-in didn't finish. Try again.";
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const user = await getCurrentUser();
  if (user && !user.isDemo) redirect("/home");
  const { error } = await searchParams;
  return (
    <AuthPage title="Start tracking">
      <p className="mb-6 max-w-prose text-base text-muted">
        Sign in, or create your account, with Google. ExpenseIt only receives your name and email address.
      </p>
      <GoogleSignIn problem={problemFor(error)} />
    </AuthPage>
  );
}
