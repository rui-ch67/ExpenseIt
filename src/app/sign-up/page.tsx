import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { AuthForm } from "@/ui/auth-form";
import { AuthPage } from "@/ui/auth-page";

export const metadata = { title: "Create an account" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user && !user.isDemo) redirect("/home");
  return (
    <AuthPage title="Start tracking">
      <AuthForm mode="sign-up" />
    </AuthPage>
  );
}
