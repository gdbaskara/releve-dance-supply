import { useTranslations } from "next-intl";
import { SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/store/empty-state";
import { WhatsAppButton } from "@/components/store/whatsapp-button";

/** Unknown order number on /pay or /success. */
export function PayNotFound({ waHref }: { waHref: string }) {
  const t = useTranslations("pay");
  const tc = useTranslations("common");
  return (
    <EmptyState
      icon={<SearchX size={40} strokeWidth={1} aria-hidden />}
      title={t("notFound.title")}
      description={t("notFound.body")}
      className="py-24"
      actions={
        <>
          <Button asChild variant="secondary">
            <Link href="/">{t("backToShop")}</Link>
          </Button>
          <WhatsAppButton href={waHref} label={tc("wa.ask")} />
        </>
      }
    />
  );
}
