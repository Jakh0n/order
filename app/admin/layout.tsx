import { ClipboardList, Settings, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/language-switcher";

const nav = [
  { href: "/admin/orders", key: "orders", icon: ClipboardList },
  { href: "/admin/menu", key: "menu", icon: UtensilsCrossed },
  { href: "/admin/settings", key: "settings", icon: Settings },
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const t = await getTranslations("admin");
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="bg-muted/40 border-b md:w-56 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold">{t("title")}</span>
          <LanguageSwitcher />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col">
          {nav.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="hover:bg-muted flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm"
            >
              <Icon className="size-4" />
              {t(key)}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
