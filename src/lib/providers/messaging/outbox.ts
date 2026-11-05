/** OutboxMessagingProvider — renders the id/en template and stores it in wa_outbox (shown in Admin → WA Outbox). */
import type { Locale, MessageTemplate, MessagingProvider } from "@/lib/contracts";
import { renderNotification } from "@/lib/wa/templates";
import { db as defaultDb, type DB } from "@/db";
import { waOutbox } from "@/db/schema";

export class OutboxMessagingProvider implements MessagingProvider {
  readonly name = "outbox" as const;
  constructor(private readonly db: DB = defaultDb) {}

  async send(
    to: string,
    template: MessageTemplate,
    locale: Locale,
    vars: Record<string, string>,
    orderId?: string,
  ): Promise<void> {
    const body = renderNotification(template, locale, vars);
    await this.db.insert(waOutbox).values({ toWa: to, template, locale, body, orderId: orderId ?? null, status: "SENT" });
  }
}
