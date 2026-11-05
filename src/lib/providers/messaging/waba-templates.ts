/**
 * Meta WhatsApp template mapping (WA-06). Each MessageTemplate maps to one approved Meta template
 * (`<WABA_TEMPLATE_PREFIX><name>`, e.g. releve_order_created) in two languages (id, en) whose BODY uses
 * positional parameters {{1}}…{{n}} in the order below. Suggested bodies (= docs/05 §6 wording) are in
 * docs/11-go-live-integrations.md; keep them in sync with src/lib/wa/templates.ts.
 */
import type { MessageTemplate } from "@/lib/contracts";

export const WABA_TEMPLATES: Record<MessageTemplate, { name: string; params: string[] }> = {
  ORDER_CREATED: { name: "order_created", params: ["name", "order_no", "total", "method", "expires", "pay_url"] },
  PAYMENT_PAID: { name: "payment_paid", params: ["order_no", "total", "track_url"] },
  PAYMENT_EXPIRED: { name: "payment_expired", params: ["order_no", "shop_url"] },
  ORDER_SHIPPED: { name: "order_shipped", params: ["order_no", "courier", "awb", "track_url"] },
  ORDER_DELIVERED: { name: "order_delivered", params: ["order_no"] },
  BACK_IN_STOCK: { name: "back_in_stock", params: ["name", "variant", "url"] },
  PAYMENT_INSTRUCTIONS: { name: "payment_instructions", params: ["order_no", "method", "va_or_qr_hint", "total", "expires"] },
  LOW_STOCK_ALERT: { name: "low_stock_alert", params: ["state", "product", "code", "variant", "available", "admin_url"] },
};

/**
 * Meta rejects empty parameters and parameters containing newlines, tabs or more than 4 consecutive spaces
 * (error 132018), and caps text parameters (we cut at 1000 chars). Empty → "-".
 */
export function sanitizeParam(value: string | undefined): string {
  const v = (value ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();
  return v ? v.slice(0, 1000) : "-";
}

export function templateParams(template: MessageTemplate, vars: Record<string, string>): string[] {
  return WABA_TEMPLATES[template].params.map((k) => sanitizeParam(vars[k]));
}
