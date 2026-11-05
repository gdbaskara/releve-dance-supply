import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { Wordmark } from "@/components/store/wordmark";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const nextRaw = typeof sp.next === "string" ? sp.next : undefined;
  const next = nextRaw?.startsWith("/admin") ? nextRaw : undefined;
  if (await getAdminSession()) redirect(next ?? "/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <Wordmark size="md" />
          <span className="eyebrow text-ink-muted">Panel admin</span>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="mb-1 text-xl font-semibold text-ink">Masuk</h1>
          <p className="mb-5 text-sm text-ink-muted">Kelola order, stok, dan checkout link.</p>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
