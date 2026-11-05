"use client";
/** CAT-06 search box: submits ?q= to /search (works without JS as a GET form). */
import * as React from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchForm({ defaultValue = "", action }: { defaultValue?: string; action: string }) {
  const t = useTranslations("nav.search");
  const router = useRouter();
  const [q, setQ] = React.useState(defaultValue);
  return (
    <form
      role="search"
      action={action}
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        router.push(v ? `/search?q=${encodeURIComponent(v)}` : "/search");
      }}
      className="flex items-end gap-2"
    >
      <Input
        type="search"
        name="q"
        label={t("label")}
        placeholder={t("placeholder")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={!defaultValue}
        enterKeyHint="search"
        wrapperClassName="flex-1"
      />
      <Button type="submit" leadingIcon={<Search size={18} strokeWidth={1.5} aria-hidden />} aria-label={t("submit")} className="px-4 md:px-6">
        <span className="hidden md:inline">{t("submit")}</span>
      </Button>
    </form>
  );
}
