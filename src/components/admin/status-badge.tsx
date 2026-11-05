import type { MessageTemplate, OrderStatus } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, TEMPLATE_LABEL, TEMPLATE_TONE } from "./labels";

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge variant={ORDER_STATUS_TONE[status]} className={className} data-status={status}>
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  );
}

export function TemplateBadge({ template }: { template: MessageTemplate }) {
  return (
    <Badge variant={TEMPLATE_TONE[template]} data-template={template}>
      {TEMPLATE_LABEL[template]}
    </Badge>
  );
}
