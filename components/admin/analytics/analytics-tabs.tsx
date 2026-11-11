"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/** Overview | Customers */
export function AnalyticsTabs() {
  const t = useTranslations("analytics");
  const pathname = usePathname();
  const tabs = [
    { href: "/admin/analytics", label: t("overview") },
    { href: "/admin/analytics/customers", label: t("customers") },
  ];
  return (
    <nav className="border-b">
      <ul className="-mb-px flex gap-4">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center border-b-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
