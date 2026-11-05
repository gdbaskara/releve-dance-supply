import { useTranslations } from "next-intl";
import type { MessageTemplate, OrderStatus } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_TONE, TEMPLATE_TONE } from "./labels";

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const t = useTranslations("admin.orderStatus");
  return (
    <Badge variant={ORDER_STATUS_TONE[status]} className={className} data-status={status}>
      {t(status)}
    </Badge>
  );
}

export function TemplateBadge({ template }: { template: MessageTemplate }) {
  const t = useTranslations("admin.template");
  return (
    <Badge variant={TEMPLATE_TONE[template]} data-template={template}>
      {t(template)}
    </Badge>
  );
}
