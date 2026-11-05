import { requireAdmin } from "@/lib/auth/session";
import { Wordmark } from "@/components/store/wordmark";
import { AdminNav } from "@/components/admin/admin-nav";

/** Every /admin page except /admin/login: requires the admin session cookie (ADM-01). */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <AdminNav
        brand={
          <span className="flex items-center gap-2">
            <Wordmark size="sm" compact />
            <span className="rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-button text-accent-ink">Admin</span>
          </span>
        }
        adminName={admin.name}
        adminEmail={admin.email}
      />
      <main id="main" className="px-4 py-5 md:px-6 lg:ml-60 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
