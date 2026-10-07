"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./button";
import { Field, Input } from "./field";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signUp = mode === "sign-up";

  async function submit(form: FormData) {
    setPending(true);
    setError(null);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const { error } = signUp
      ? await authClient.signUp.email({ email, password, name: String(form.get("name") ?? "").trim() })
      : await authClient.signIn.email({ email, password });
    setPending(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many attempts. Wait a minute and try again."
          : signUp
            ? (error.message ?? "That account couldn't be created.")
            : "That email and password don't match an account.",
      );
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-4" noValidate={false}>
      {signUp && (
        <Field label="Your name" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required maxLength={80} />
        </Field>
      )}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" hint={signUp ? "At least 8 characters." : undefined}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={signUp ? "new-password" : "current-password"}
          minLength={8}
          required
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />}
        {signUp ? "Create account" : "Sign in"}
      </Button>
      <p className="text-sm">
        {signUp ? "Already have an account? " : "New to ExpenseIt? "}
        <Link href={signUp ? "/sign-in" : "/sign-up"} className="font-bold">
          {signUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
