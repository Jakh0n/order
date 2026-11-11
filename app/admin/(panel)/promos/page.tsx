import { TicketPercent } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PromoForm } from "@/components/admin/promos/promo-form";
import { PromoItem, type PromoItemView } from "@/components/admin/promos/promo-item";
import { UpgradeCard } from "@/components/admin/upgrade";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { formatMoney } from "@/lib/money";
import { isPro } from "@/lib/plan";
import { type AdminPromo, listPromos } from "@/lib/promos/data";

export default function AdminPromosPage() {
  return (
    <Suspense fallback={<PromosSkeleton />}>
      <AdminPromos />
    </Suspense>
  );
}

async function AdminPromos() {
  const { store } = await requireOwner();
  const [promos, t, format] = await Promise.all([
    listPromos(store.id),
    getTranslations("adminPromos"),
    getFormatter(),
  ]);
  const now = new Date();

  const view = (p: AdminPromo): PromoItemView => {
    const expired = p.expiresAt !== null && p.expiresAt <= now;
    const usedUp = p.maxUses !== null && p.usedCount >= p.maxUses;
    const conditions = [
      p.minSubtotal > 0
        ? t("fromAmount", { amount: formatMoney(p.minSubtotal, store.currency) })
        : t("anyAmount"),
      p.maxUses !== null
        ? t("usesOf", { used: p.usedCount, max: p.maxUses })
        : t("uses", { used: p.usedCount }),
    ];
    if (p.expiresAt) {
      // expiresAt is the end of the last day → show that day
      const lastDay = new Date(p.expiresAt.getTime() - 1);
      conditions.push(
        t("until", {
          date: format.dateTime(lastDay, { dateStyle: "medium", timeZone: store.timeZone }),
        }),
      );
    }
    return {
      id: p.id,
      code: p.code,
      discount: p.type === "PERCENT" ? `−${p.value}%` : `−${formatMoney(p.value, store.currency)}`,
      conditions,
      isActive: p.isActive,
      state: !p.isActive ? "off" : expired ? "expired" : usedUp ? "usedUp" : "active",
    };
  };

  return (
    <div className="flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("lead")}</p>
      </div>

      {isPro(store) ? (
        <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
          <h2 className="font-semibold">{t("newTitle")}</h2>
          <PromoForm currency={store.currency} />
        </section>
      ) : (
        <UpgradeCard title={t("lockedTitle")} text={t("lockedText")} />
      )}

      {promos.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
          <TicketPercent className="size-8 opacity-50" aria-hidden />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {promos.map((p) => (
            <PromoItem key={p.id} promo={view(p)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PromosSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
