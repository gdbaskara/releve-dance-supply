"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  const initialEnabled = enabledCount > 0 && enabledCount === variantCount;
  const [enabled, setEnabled] = React.useState<boolean>(initialEnabled);
  const [leadValue, setLeadValue] = React.useState(lead ?? "4-6");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const dirty = enabled !== initialEnabled || (enabled && leadValue !== (lead ?? "4-6")) || (enabledCount > 0 && !initialEnabled);

  const save = () => {
    setError(null);
    if (enabled && !/^\d{1,2}(-\d{1,2})?$/.test(leadValue.trim())) {
      setError("Format: 4-6 atau 3");
      return;
    }
    startTransition(async () => {
      const res = await setPreorderAction({ target: { productId }, enabled, lead: enabled ? leadValue.trim() : null });
      if (res.ok) {
        toast({ variant: "success", title: enabled ? "Pre-order aktif" : "Pre-order dimatikan", description: `${res.updated} varian diperbarui.` });
        router.refresh();
      } else {
        setError(res.error === "INVALID_LEAD" ? "Format: 4-6 atau 3" : "Gagal menyimpan");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Checkbox
        checked={enabled}
        onCheckedChange={(v) => setEnabled(v === true)}
        label="Terima pre-order saat stok habis"
        description={
          enabledCount === 0
            ? "Saat ini tidak aktif."
            : enabledCount === variantCount
              ? `Aktif untuk semua ${variantCount} varian.`
              : `Aktif untuk ${enabledCount} dari ${variantCount} varian. Simpan untuk menyamakan semua varian.`
        }
      />
      <Input
        label="Estimasi (minggu)"
        value={leadValue}
        onChange={(e) => setLeadValue(e.target.value)}
        disabled={!enabled}
        error={error ?? undefined}
        helper="Contoh: 4-6"
        inputMode="numeric"
        className="h-10"
        wrapperClassName="max-w-40"
      />
      <div>
        <Button size="sm" variant="secondary" onClick={save} loading={pending} disabled={!dirty}>
          Simpan pre-order
        </Button>
      </div>
    </div>
  );
}
