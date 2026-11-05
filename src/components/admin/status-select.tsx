"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/lib/contracts";
import { transitionOrderAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { COURIERS, ORDER_STATUS_LABEL, TRANSITION_LABEL } from "./labels";

const ERROR_TEXT: Record<string, string> = {
  TRACKING_REQUIRED: "Kurir dan nomor resi wajib diisi.",
  INVALID_TRANSITION: "Status order sudah berubah. Muat ulang halaman.",
  NOT_FOUND: "Order tidak ditemukan.",
  INVALID_INPUT: "Data tidak valid.",
};

const DESTRUCTIVE: OrderStatus[] = ["CANCELLED", "REFUND_PENDING"];

/** Render with `key={status}` so the choice resets after a transition. ADM-04 StatusSelect: offers only valid transitions (adminTransitionsFor); SHIPPED needs courier + AWB (SHP-03). */
export function StatusSelect({
  orderNo,
  status,
  allowed,
  defaultCourier,
}: {
  orderNo: string;
  status: OrderStatus;
  allowed: OrderStatus[];
  defaultCourier?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [to, setTo] = React.useState<OrderStatus | "">(allowed.find((s) => !DESTRUCTIVE.includes(s)) ?? "");
  const [courier, setCourier] = React.useState<string>(COURIERS.includes(defaultCourier as (typeof COURIERS)[number]) ? defaultCourier! : "");
  const [awb, setAwb] = React.useState("");
  const [fieldErr, setFieldErr] = React.useState<{ courier?: string; awb?: string }>({});
  const [error, setError] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  if (allowed.length === 0) {
    return <p className="text-sm text-ink-muted">Tidak ada aksi lanjutan untuk status {ORDER_STATUS_LABEL[status].toLowerCase()}.</p>;
  }

  const run = () => {
    if (!to) return;
    startTransition(async () => {
      setError(null);
      const res = await transitionOrderAction({
        orderNo,
        to,
        ...(to === "SHIPPED" ? { courier: courier.trim(), awb: awb.trim() } : {}),
      });
      setConfirmOpen(false);
      if (res.ok) {
        toast({
          variant: "success",
          title: `Status: ${ORDER_STATUS_LABEL[res.status]}`,
          description:
            res.status === "SHIPPED" || res.status === "DELIVERED" ? "Notifikasi WA untuk pembeli masuk ke outbox." : undefined,
        });
        setAwb("");
        router.refresh();
      } else {
        setError(ERROR_TEXT[res.error] ?? "Gagal mengubah status.");
      }
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to) return;
    if (to === "SHIPPED") {
      const fe: typeof fieldErr = {};
      if (!courier) fe.courier = "Pilih kurir";
      if (!awb.trim()) fe.awb = "Isi nomor resi";
      setFieldErr(fe);
      if (fe.courier || fe.awb) return;
    }
    if (DESTRUCTIVE.includes(to)) setConfirmOpen(true);
    else run();
  };

  const destructive = to !== "" && DESTRUCTIVE.includes(to);

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-label="Ubah status order">
      <Select
        label="Ubah status ke"
        value={to}
        onChange={(e) => {
          setTo(e.target.value as OrderStatus);
          setError(null);
        }}
        placeholder="Pilih aksi…"
        options={allowed.map((s) => ({ value: s, label: `${TRANSITION_LABEL[s] ?? ORDER_STATUS_LABEL[s]} → ${ORDER_STATUS_LABEL[s]}` }))}
        className="h-10"
        name="to"
      />
      {to === "SHIPPED" ? (
        <>
          <Select
            label="Kurir"
            value={courier}
            onChange={(e) => {
              setCourier(e.target.value);
              setFieldErr((f) => ({ ...f, courier: undefined }));
            }}
            placeholder="Pilih kurir"
            options={COURIERS.map((c) => ({ value: c, label: c }))}
            error={fieldErr.courier}
            className="h-10"
            name="courier"
          />
          <Input
            label="Nomor resi (AWB)"
            value={awb}
            onChange={(e) => {
              setAwb(e.target.value);
              setFieldErr((f) => ({ ...f, awb: undefined }));
            }}
            error={fieldErr.awb}
            autoComplete="off"
            className="h-10 font-mono"
            name="awb"
            maxLength={60}
          />
        </>
      ) : null}
      {error ? (
        <Notice tone="error" live>
          {error}
        </Notice>
      ) : null}
      <Button type="submit" size="sm" variant={destructive ? "danger" : "primary"} loading={pending && !confirmOpen} disabled={!to}>
        {to ? (TRANSITION_LABEL[to] ?? "Terapkan") : "Terapkan"}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          variant="responsive"
          size="sm"
          title={to === "REFUND_PENDING" ? "Batalkan & refund order?" : "Batalkan order?"}
          footer={
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button size="sm" variant="ghost">
                  Kembali
                </Button>
              </DialogClose>
              <Button size="sm" variant="danger" onClick={run} loading={pending}>
                Ya, batalkan
              </Button>
            </div>
          }
        >
          <p className="text-sm text-ink">
            Order <span className="font-mono font-semibold">{orderNo}</span> akan berstatus{" "}
            <strong>{to ? ORDER_STATUS_LABEL[to] : ""}</strong>.{" "}
            {status === "PENDING_PAYMENT"
              ? "Reservasi stok dilepas dan pembayaran yang menunggu dibatalkan."
              : to === "REFUND_PENDING"
                ? "Stok dikembalikan ke gudang. Proses refund ke pembeli dilakukan manual."
                : "Tindakan ini tidak bisa dibatalkan."}
          </p>
        </DialogContent>
      </Dialog>
    </form>
  );
}
