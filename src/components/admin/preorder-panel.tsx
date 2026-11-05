"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setPreorderAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

/** ADM-03: pre-order toggle + lead time (weeks) for every variant of a product. */
export function PreorderPanel({
  productId,
  enabledCount,
  variantCount,
  lead,
}: {
  productId: string;
  enabledCount: number;
  variantCount: number;
  lead: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.preorder");
  const initialEnabled = enabledCount > 0 && enabledCount === variantCount;
  const [enabled, setEnabled] = React.useState<boolean>(initialEnabled);
  const [leadValue, setLeadValue] = React.useState(lead ?? "4-6");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const dirty = enabled !== initialEnabled || (enabled && leadValue !== (lead ?? "4-6")) || (enabledCount > 0 && !initialEnabled);

  const save = () => {
    setError(null);
    if (enabled && !/^\d{1,2}(-\d{1,2})?$/.test(leadValue.trim())) {
      setError(t("leadFormat"));
      return;
    }
    startTransition(async () => {
      const res = await setPreorderAction({ target: { productId }, enabled, lead: enabled ? leadValue.trim() : null });
      if (res.ok) {
        toast({ variant: "success", title: enabled ? t("toastEnabled") : t("toastDisabled"), description: t("toastUpdated", { count: res.updated }) });
        router.refresh();
      } else {
        setError(res.error === "INVALID_LEAD" ? t("leadFormat") : t("saveFailed"));
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Checkbox
        checked={enabled}
        onCheckedChange={(v) => setEnabled(v === true)}
        label={t("accept")}
        description={
          enabledCount === 0
            ? t("inactive")
            : enabledCount === variantCount
              ? t("activeAll", { count: variantCount })
              : t("activeSome", { enabled: enabledCount, total: variantCount })
        }
      />
      <Input
        label={t("lead")}
        value={leadValue}
        onChange={(e) => setLeadValue(e.target.value)}
        disabled={!enabled}
        error={error ?? undefined}
        helper={t("leadHelper")}
        inputMode="numeric"
        className="h-10"
        wrapperClassName="max-w-40"
      />
      <div>
        <Button size="sm" variant="secondary" onClick={save} loading={pending} disabled={!dirty}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
