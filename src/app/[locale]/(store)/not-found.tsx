import { useTranslations } from "next-intl";
import { Compass } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/store/empty-state";

/** 404 inside the store chrome (unknown product / listing / info slug). */
export default function StoreNotFound() {
  const t = useTranslations("nav.notFound");
  return (
    <div className="container-page py-16">
      <EmptyState
        icon={<Compass size={40} strokeWidth={1} />}
        title={t("title")}
        description={t("body")}
        actions={
          <>
            <Button asChild>
              <Link href="/">{t("home")}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/c/shoes">{t("shop")}</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
