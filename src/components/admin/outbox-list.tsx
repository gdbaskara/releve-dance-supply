import type { OutboxRow } from "@/lib/services/outbox";
import { formatDateTimeWIB, formatPhoneID } from "@/lib/format";
import Link from "next/link";
import { CheckCheck, Clock, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/store/whatsapp-button";
import { TemplateBadge } from "./status-badge";

const STATUS = {
  SENT: { label: "Terkirim", icon: CheckCheck, cls: "text-info" },
  QUEUED: { label: "Antre", icon: Clock, cls: "text-ink-muted" },
  FAILED: { label: "Gagal", icon: X, cls: "text-error" },
} as const;

/** Render URLs in a message body as links (bodies are plain text from our own templates). */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-all text-info underline underline-offset-2">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** ADM-06 OutboxList: each message previewed as a WhatsApp-like chat bubble. */
export function OutboxList({ items }: { items: OutboxRow[] }) {
  if (items.length === 0) return <p className="px-4 py-10 text-center text-sm text-ink-muted">Belum ada pesan.</p>;
  return (
    <ul className="flex flex-col gap-4 bg-surface-alt p-3 md:p-5" data-testid="outbox">
      {items.map((m) => {
        const st = STATUS[m.status];
        const Icon = st.icon;
        return (
          <li key={m.id} className="flex flex-col gap-1.5" data-template={m.template} data-order={m.orderNo ?? ""}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <WhatsAppIcon size={14} className="text-whatsapp-ink" />
                {formatPhoneID(m.toWa)}
              </span>
              <TemplateBadge template={m.template} />
              {m.orderNo ? (
                <Link href={`/admin/orders/${m.orderNo}`} className="font-mono underline underline-offset-2 hover:text-ink">
                  {m.orderNo}
                </Link>
              ) : null}
              <span className="uppercase">{m.locale}</span>
            </div>
            <div className="relative max-w-[min(100%,560px)] self-start rounded-lg rounded-tl-none border border-border bg-surface px-3 pb-1.5 pt-2 text-sm text-ink shadow-[0_1px_0_var(--color-border)]">
              <span aria-hidden className="absolute -left-2 top-0 size-0 border-r-[8px] border-t-[8px] border-r-surface border-t-transparent" />
              <p className="whitespace-pre-wrap break-words">
                <Linkified text={m.body} />
              </p>
              <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-ink-muted">
                <time dateTime={m.createdAt.toISOString()}>{formatDateTimeWIB(m.createdAt)}</time>
                <Icon size={14} strokeWidth={2} aria-label={st.label} className={st.cls} />
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
