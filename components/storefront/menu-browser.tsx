"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import type { MenuLayout } from "@/lib/design";
import type { MenuCategory } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

import { ProductCard } from "./product-card";

/** "Lag'mon" va "lagmon" bir xil topilsin */
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[ʻʼ'`‘’]/g, "")
    .trim();
}

/**
 * Qidiruv + yopishqoq kategoriya tablari (scroll'ga qarab faol tab) + taomlar ro'yxati.
 * take.app uslubida: tab bosilsa — bo'limga silliq o'tadi, aylantirilsa — tab o'zi almashadi.
 */
export function MenuBrowser({
  cartKey,
  categories,
  layout = "list",
  showSearch = true,
  showDescriptions = true,
}: {
  cartKey: string;
  categories: MenuCategory[];
  /** "list" — rows with a photo on the right; "grid" — 2 photo cards per row (Design page) */
  layout?: MenuLayout;
  /** Design page toggles */
  showSearch?: boolean;
  showDescriptions?: boolean;
}) {
  const t = useTranslations("menu");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(categories[0]?.id ?? null);
  const barRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const scrollingTo = useRef<string | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const q = normalize(query);
  const visible = useMemo(() => {
    if (!q) return categories;
    return categories
      .map((c) => ({
        ...c,
        products: c.products.filter((p) =>
          normalize(`${p.name} ${p.description ?? ""}`).includes(q),
        ),
      }))
      .filter((c) => c.products.length > 0);
  }, [categories, q]);

  // Scroll'ga qarab faol kategoriya
  useEffect(() => {
    if (q) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const offset = (barRef.current?.offsetHeight ?? 0) + 16;
        let current = categories[0]?.id ?? null;
        for (const c of categories) {
          const el = sectionRefs.current.get(c.id);
          if (el && el.getBoundingClientRect().top - offset <= 0) current = c.id;
        }
        // Tab bosilgandan keyingi silliq aylantirish paytida "sakramasin"
        if (scrollingTo.current) {
          if (current === scrollingTo.current) scrollingTo.current = null;
          return;
        }
        setActiveId(current);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [categories, q]);

  // Faol tab gorizontal qatorda ko'rinib tursin
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-id="${activeId}"]`);
    if (!row || !chip) return;
    row.scrollTo({
      left: chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2,
      behavior: "smooth",
    });
  }, [activeId]);

  function goTo(id: string) {
    const el = sectionRefs.current.get(id);
    if (!el) return;
    setActiveId(id);
    scrollingTo.current = id;
    // Sahifa oxiridagi bo'limga to'liq yetib bo'lmasligi mumkin — bayroq baribir tozalansin
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => (scrollingTo.current = null), 900);
    const offset = (barRef.current?.offsetHeight ?? 0) + 8;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - offset,
      behavior: "smooth",
    });
  }

  return (
    <>
      <div
        ref={barRef}
        className="bg-background/95 sticky top-0 z-30 border-b px-4 pt-3 pb-2 backdrop-blur"
      >
        <label
          className={cn(
            "bg-muted focus-within:ring-ring/40 flex h-10 items-center gap-2 rounded-xl px-3 focus-within:ring-2",
            !showSearch && "hidden",
          )}
        >
          <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("clearSearch")}
              className="text-muted-foreground hover:bg-background rounded-full p-1"
            >
              <X className="size-4" />
            </button>
          )}
        </label>

        {!q && categories.length > 1 && (
          <nav aria-label={t("categories")} className={cn("-mx-4", showSearch && "mt-2")}>
            <div
              ref={chipsRef}
              className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
            >
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  data-id={c.id}
                  onClick={() => goTo(c.id)}
                  aria-current={activeId === c.id ? "true" : undefined}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                    activeId === c.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/70",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>

      <main
        id="menu"
        tabIndex={-1}
        className="flex scroll-mt-28 flex-col gap-3 px-3 py-3 outline-none sm:px-4"
      >
        {categories.length === 0 && (
          <p className="text-muted-foreground py-16 text-center">{t("empty")}</p>
        )}
        {q && visible.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center gap-3 py-16 text-center">
            <p>{t("noResults", { query })}</p>
            <button
              type="button"
              className="text-primary text-sm font-medium"
              onClick={() => setQuery("")}
            >
              {t("clearSearch")}
            </button>
          </div>
        )}
        {visible.map((category) => (
          <section
            key={category.id}
            ref={(el) => {
              if (el) sectionRefs.current.set(category.id, el);
              else sectionRefs.current.delete(category.id);
            }}
            className="bg-background rounded-2xl px-4 pt-4 pb-1"
            aria-labelledby={`c-${category.id}`}
          >
            <h2 id={`c-${category.id}`} className="text-lg font-bold">
              {category.name}
            </h2>
            <div
              className={
                layout === "grid"
                  ? "grid grid-cols-2 gap-x-3 gap-y-4 pt-3 pb-4 sm:grid-cols-3"
                  : "divide-y"
              }
            >
              {category.products.map((product) => (
                <ProductCard
                  key={product.id}
                  cartKey={cartKey}
                  product={product}
                  layout={layout}
                  showDescription={showDescriptions}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
