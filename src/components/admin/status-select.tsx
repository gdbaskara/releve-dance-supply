"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { OrderStatus } from "@/lib/contracts";
import { transitionOrderAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { COURIERS, TRANSITION_TARGETS } from "./labels";

/** Server error codes that have a message in admin.json `statusSelect.errors`. */
const KNOWN_ERRORS = ["TRACKING_REQUIRED", "INVALID_TRANSITION", "NOT_FOUND", "INVALID_INPUT"] as const;

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
  const t = useTranslations("admin.statusSelect");
  const tStatus = useTranslations("admin.orderStatus");
  const tTransition = useTranslations("admin.transition");
  const actionLabel = (s: OrderStatus) => (TRANSITION_TARGETS.includes(s) ? tTransition(s) : tStatus(s));
  const [to, setTo] = React.useState<OrderStatus | "">(allowed.find((s) => !DESTRUCTIVE.includes(s)) ?? "");
  const [courier, setCourier] = React.useState<string>(COURIERS.includes(defaultCourier as (typeof COURIERS)[number]) ? defaultCourier! : "");
  const [awb, setAwb] = React.useState("");
  const [fieldErr, setFieldErr] = React.useState<{ courier?: string; awb?: string }>({});
  const [error, setError] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  if (allowed.length === 0) {
    return <p className="text-sm text-ink-muted">{t("noActions", { status: tStatus(status).toLowerCase() })}</p>;
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
          title: t("toastTitle", { status: tStatus(res.status) }),
          description: res.status === "SHIPPED" || res.status === "DELIVERED" ? t("toastWaQueued") : undefined,
        });
        setAwb("");
        router.refresh();
      } else {
        setError((KNOWN_ERRORS as readonly string[]).includes(res.error) ? t(`errors.${res.error}`) : t("errors.failed"));
      }
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to) return;
    if (to === "SHIPPED") {
      const fe: typeof fieldErr = {
        ...(courier ? {} : { courier: t("courierRequired") }),
        ...(awb.trim() ? {} : { awb: t("awbRequired") }),
      };
      setFieldErr(fe);
      if (fe.courier || fe.awb) return;
    }
    if (DESTRUCTIVE.includes(to)) setConfirmOpen(true);
    else run();
  };

  const destructive = to !== "" && DESTRUCTIVE.includes(to);

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-label={t("formLabel")}>
      <Select
        label={t("changeTo")}
        value={to}
        onChange={(e) => {
          setTo(e.target.value as OrderStatus);
          setError(null);
        }}
        placeholder={t("pickAction")}
        options={allowed.map((s) => ({ value: s, label: t("option", { action: actionLabel(s), status: tStatus(s) }) }))}
        className="h-10"
        name="to"
      />
      {to === "SHIPPED" ? (
        <>
          <Select
            label={t("courier")}
            value={courier}
            onChange={(e) => {
              setCourier(e.target.value);
              setFieldErr((f) => ({ ...f, courier: undefined }));
            }}
            placeholder={t("pickCourier")}
            options={COURIERS.map((c) => ({ value: c, label: c }))}
            error={fieldErr.courier}
            className="h-10"
            name="courier"
          />
          <Input
            label={t("awb")}
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
        {to && TRANSITION_TARGETS.includes(to) ? tTransition(to) : t("apply")}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          variant="responsive"
          size="sm"
          title={to === "REFUND_PENDING" ? t("confirmRefundTitle") : t("confirmCancelTitle")}
          footer={
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button size="sm" variant="ghost">
                  {t("back")}
                </Button>
              </DialogClose>
              <Button size="sm" variant="danger" onClick={run} loading={pending}>
                {t("confirm")}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-ink">
            {t.rich("confirmBody", {
              orderNo,
              status: to ? tStatus(to) : "",
              mono: (chunks) => <span className="font-mono font-semibold">{chunks}</span>,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}{" "}
            {status === "PENDING_PAYMENT" ? t("releaseReservation") : to === "REFUND_PENDING" ? t("restockRefund") : t("irreversible")}
          </p>
        </DialogContent>
      </Dialog>
    </form>
  );
}
