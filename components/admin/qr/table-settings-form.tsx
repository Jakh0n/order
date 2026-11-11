"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveTableSettings } from "@/lib/settings/actions";
import { MAX_TABLES } from "@/lib/validators";

/** Table ordering on/off + number of tables (QR page) */
export function TableSettingsForm({
  dineInEnabled,
  tableCount,
}: {
  dineInEnabled: boolean;
  tableCount: number;
}) {
  const t = useTranslations("table");
  const [enabled, setEnabled] = useState(dineInEnabled);
  const [count, setCount] = useState(tableCount > 0 ? String(tableCount) : "10");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = enabled !== dineInEnabled || (enabled && Number(count) !== tableCount);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveTableSettings({
        dineInEnabled: enabled,
        tableCount: enabled ? Number.parseInt(count, 10) : tableCount,
      });
      if (result.ok) {
        toast.success(t("saved"));
        return;
      }
      const key = result.fieldErrors?.tableCount ?? result.error;
      setError(t(`errors.${key}`));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
        <span className="font-medium">{t("enable")}</span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>

      <div className="flex flex-wrap items-end gap-3">
        <div className={enabled ? "flex flex-col gap-1.5" : "hidden"}>
          <Label htmlFor="tableCount">{t("tableCount")}</Label>
          <Input
            id="tableCount"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_TABLES}
            step={1}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            aria-invalid={!!error}
            className="h-10 w-28"
          />
        </div>
        <Button onClick={save} disabled={!dirty || pending} className="gap-2">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("save")}
        </Button>
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
