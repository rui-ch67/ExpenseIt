import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { AuthForm } from "@/ui/auth-form";
import { AuthPage } from "@/ui/auth-page";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user && !user.isDemo) redirect("/home");
  return (
    <AuthPage title="Welcome back">
      <AuthForm mode="sign-in" />
    </AuthPage>
  );
}
