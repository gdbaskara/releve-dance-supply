"use client";

import * as React from "react";
import { loginAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";

const ERRORS = {
  INVALID_CREDENTIALS: "Email atau password salah.",
  RATE_LIMITED: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit.",
} as const;

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = React.useActionState(loginAction, null);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate={false}>
      {state && !state.ok ? (
        <Notice tone="error" live>
          {ERRORS[state.error]}
        </Notice>
      ) : null}
      <Input label="Email" name="email" type="email" autoComplete="username" required autoFocus defaultValue="" />
      <Input label="Password" name="password" type="password" autoComplete="current-password" required />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Button type="submit" fullWidth loading={pending}>
        Masuk
      </Button>
    </form>
  );
}
