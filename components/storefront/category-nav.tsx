import { getTranslations } from "next-intl/server";

import type { MenuCategory } from "@/lib/menu-types";

export async function CategoryNav({ categories }: { categories: MenuCategory[] }) {
  const t = await getTranslations("menu");
  if (categories.length < 2) return null;

  return (
    <nav
      aria-label={t("categories")}
      className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur"
    >
      <ul className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-2">
        {categories.map((c) => (
          <li key={c.id} className="shrink-0">
            <a
              href={`#c-${c.id}`}
              className="bg-muted hover:bg-muted/70 block rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap"
            >
              {c.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
