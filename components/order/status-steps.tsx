import type { OrderStatus, OrderType } from "@prisma/client";
import { Check, X } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";

function stepsFor(type: OrderType): OrderStatus[] {
  return type === "DELIVERY"
    ? ["NEW", "ACCEPTED", "READY", "ON_THE_WAY", "COMPLETED"]
    : ["NEW", "ACCEPTED", "READY", "COMPLETED"];
}

export async function StatusSteps({ status, type }: { status: OrderStatus; type: OrderType }) {
  const t = await getTranslations("status");

  if (status === "CANCELLED") {
    return (
      <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg px-3 py-2 font-medium">
        <X className="size-4" />
        {t("CANCELLED")}
      </div>
    );
  }

  const steps = stepsFor(type);
  const current = Math.max(0, steps.indexOf(status));

  return (
    <ol className="flex flex-col gap-0">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex items-center gap-3 py-1.5">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                done && "border-primary bg-primary text-primary-foreground",
                active &&
                  "border-primary bg-primary text-primary-foreground ring-primary/20 ring-4",
                !done && !active && "text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn(active ? "font-semibold" : !done && "text-muted-foreground")}>
              {t(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
