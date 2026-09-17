"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";
import { Field, FormError, SubmitButton } from "./form-bits";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border bg-card p-6">
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field label="Password" name="password" type="password" required autoComplete="current-password" />
      <FormError error={state?.error} />
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}
