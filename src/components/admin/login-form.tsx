"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("admin.login");
  const [state, formAction, pending] = React.useActionState(loginAction, null);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate={false}>
      {state && !state.ok ? (
        <Notice tone="error" live>
          {t(`errors.${state.error}`)}
        </Notice>
      ) : null}
      <Input label={t("email")} name="email" type="email" autoComplete="username" required autoFocus defaultValue="" />
      <Input label={t("password")} name="password" type="password" autoComplete="current-password" required />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Button type="submit" fullWidth loading={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
