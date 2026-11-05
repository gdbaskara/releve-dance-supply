import type { Metadata } from "next";
import Link from "next/link";
import type { MessageTemplate } from "@/lib/contracts";
import { listOutbox } from "@/lib/services/outbox";
import { Notice } from "@/components/ui/notice";
import { Panel, PageHeader } from "@/components/admin/panel";
import { ChipLink, ChipRow } from "@/components/admin/chip-link";
import { OutboxList } from "@/components/admin/outbox-list";
import { Pagination } from "@/components/admin/pagination";
import { TEMPLATES, TEMPLATE_LABEL } from "@/components/admin/labels";

export const metadata: Metadata = { title: "WA outbox" };

const PAGE_SIZE = 30;

export default async function OutboxPage({ searchParams }: PageProps<"/admin/outbox">) {
  const sp = await searchParams;
  const raw = typeof sp.template === "string" ? sp.template : "";
  const template = (TEMPLATES as string[]).includes(raw) ? (raw as MessageTemplate) : undefined;
  const orderNo = typeof sp.orderNo === "string" ? sp.orderNo.slice(0, 30) : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const result = await listOutbox({ template, orderNo: orderNo || undefined, page, pageSize: PAGE_SIZE });

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
      <PageHeader title="WA outbox" description="Mode demo: pesan WhatsApp ke pembeli disimpan di sini, tidak benar-benar dikirim." />
      <Panel flush>
        <div className="flex flex-col gap-3 border-b border-border p-4">
          {orderNo ? (
            <Notice tone="info">
              Hanya pesan untuk order <span className="font-mono font-semibold">{orderNo}</span>.{" "}
              <Link href="/admin/outbox" className="font-semibold underline underline-offset-4">
                Tampilkan semua
              </Link>
            </Notice>
          ) : null}
          <ChipRow label="Filter template">
            <ChipLink href={href({})} selected={!template}>
              Semua
            </ChipLink>
            {TEMPLATES.map((t) => (
              <ChipLink key={t} href={href({ template: t })} selected={template === t}>
                {TEMPLATE_LABEL[t]}
              </ChipLink>
            ))}
          </ChipRow>
          <p className="text-sm text-ink-muted">{result.total} pesan</p>
        </div>
        <OutboxList items={result.items} />
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} hrefFor={(p) => href({ template, page: p })} />
      </Panel>
    </>
  );
}
