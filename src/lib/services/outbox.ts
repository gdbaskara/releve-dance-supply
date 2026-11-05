/** WA outbox listing (ADM-06). Server-only. */
import { and, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders, waOutbox } from "@/db/schema";
import type { Locale, MessageTemplate } from "@/lib/contracts";

export interface OutboxFilters { template?: MessageTemplate; orderNo?: string; to?: string; page?: number; pageSize?: number }

export interface OutboxRow {
  id: string;
  toWa: string;
  template: MessageTemplate;
  locale: Locale;
  body: string;
  orderNo: string | null;
  status: "QUEUED" | "SENT" | "FAILED";
  createdAt: Date;
}

export async function listOutbox(filters: OutboxFilters = {}): Promise<{ items: OutboxRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 50, 1), 200);
  const conds: SQL[] = [];
  if (filters.template) conds.push(eq(waOutbox.template, filters.template));
  if (filters.orderNo?.trim()) conds.push(ilike(orders.orderNo, `%${filters.orderNo.trim()}%`));
  if (filters.to?.trim()) conds.push(ilike(waOutbox.toWa, `%${filters.to.replace(/\D/g, "")}%`));
  const where = conds.length ? and(...conds) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(waOutbox).leftJoin(orders, eq(orders.id, waOutbox.orderId)).where(where);
  const rows = await db
    .select({ m: waOutbox, orderNo: orders.orderNo })
    .from(waOutbox)
    .leftJoin(orders, eq(orders.id, waOutbox.orderId))
    .where(where)
    .orderBy(desc(waOutbox.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return {
    items: rows.map(({ m, orderNo }) => ({
      id: m.id, toWa: m.toWa, template: m.template, locale: m.locale as Locale, body: m.body,
      orderNo: orderNo ?? null, status: m.status, createdAt: m.createdAt,
    })),
    total,
    page,
    pageSize,
  };
}
