"use server";
/**
 * Admin UI language switch (D-31). Usable directly as <form action={setAdminLocaleAction}> with a submit button
 * named `locale` (works without JS). No admin session required: the login page shows the toggle too, and the
 * cookie only holds a validated "id" | "en" preference.
 */
import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { ADMIN_LOCALE_COOKIE, ADMIN_LOCALE_MAX_AGE, parseAdminLocale } from "@/i18n/admin-locale";

export async function setAdminLocaleAction(formData: FormData): Promise<void> {
  const locale = parseAdminLocale(formData.get("locale"));
  const store = await cookies();
  store.set(ADMIN_LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: ADMIN_LOCALE_MAX_AGE,
  });
  refresh();
}
