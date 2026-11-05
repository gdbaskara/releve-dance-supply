import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { MessageTemplate } from "@/lib/contracts";
import { listOutbox } from "@/lib/services/outbox";
import { Notice } from "@/components/ui/notice";
import { Panel, PageHeader } from "@/components/admin/panel";
import { ChipLink, ChipRow } from "@/components/admin/chip-link";
import { OutboxList } from "@/components/admin/outbox-list";
import { Pagination } from "@/components/admin/pagination";
import { TEMPLATES } from "@/components/admin/labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.outbox");
  return { title: t("title") };
}

const PAGE_SIZE = 30;

export default async function OutboxPage({ searchParams }: PageProps<"/admin/outbox">) {
  const sp = await searchParams;
  const raw = typeof sp.template === "string" ? sp.template : "";
  const template = (TEMPLATES as readonly string[]).includes(raw) ? (raw as MessageTemplate) : undefined;
  const orderNo = typeof sp.orderNo === "string" ? sp.orderNo.slice(0, 30) : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const [result, t, tTemplate] = await Promise.all([
    listOutbox({ template, orderNo: orderNo || undefined, page, pageSize: PAGE_SIZE }),
    getTranslations("admin.outbox"),
    getTranslations("admin.template"),
  ]);

  const href = (p: { template?: string; page?: number }) => {
    const u = new URLSearchParams();
    if (p.template) u.set("template", p.template);
    if (orderNo) u.set("orderNo", orderNo);
    if (p.page && p.page > 1) u.set("page", String(p.page));
    const s = u.toString();
    return s ? `/admin/outbox?${s}` : "/admin/outbox";
  };

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Panel flush>
        <div className="flex flex-col gap-3 border-b border-border p-4">
          {orderNo ? (
            <Notice tone="info">
              {t.rich("onlyOrder", { orderNo, mono: (chunks) => <span className="font-mono font-semibold">{chunks}</span> })}{" "}
              <Link href="/admin/outbox" className="font-semibold underline underline-offset-4">
                {t("showAll")}
              </Link>
            </Notice>
          ) : null}
          <ChipRow label={t("filterLabel")}>
            <ChipLink href={href({})} selected={!template}>
              {t("all")}
            </ChipLink>
            {TEMPLATES.map((tpl) => (
              <ChipLink key={tpl} href={href({ template: tpl })} selected={template === tpl}>
                {tTemplate(tpl)}
              </ChipLink>
            ))}
          </ChipRow>
          <p className="text-sm text-ink-muted">{t("count", { count: result.total })}</p>
        </div>
        <OutboxList items={result.items} />
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} hrefFor={(p) => href({ template, page: p })} />
      </Panel>
    </>
  );
}
