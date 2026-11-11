import Image from "next/image";

import { asMenuLayout } from "@/lib/design";
import { orderCategories } from "@/lib/nav";
import type { MenuCategory, StorefrontData, StorefrontStore } from "@/lib/menu-types";
import type { Section } from "@/lib/sections";

import { MenuBrowser } from "./menu-browser";
import { ReviewsSection } from "./reviews-section";
import { RichText } from "./rich-text";
import { StoreHeader } from "./store-header";

/**
 * The store page body, section by section (Website → Storefront).
 * Plain component: rendered by the store page (server) and the Design preview (client).
 */
export function StorefrontSections({
  store,
  categories,
  sections,
  reviews,
  cartKey = store.slug,
}: {
  store: StorefrontStore;
  categories: MenuCategory[];
  sections: Section[];
  reviews: StorefrontData["reviews"];
  /** The Design preview uses its own cart */
  cartKey?: string;
}) {
  return (
    <>
      {sections
        .filter((s) => !s.hidden)
        .map((section) => {
          switch (section.type) {
            case "announcement":
              return store.announcement ? (
                <p
                  key={section.id}
                  className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm font-medium"
                >
                  <RichText text={store.announcement} />
                </p>
              ) : null;
            case "header":
              return <StoreHeader key={section.id} store={store} />;
            case "menu":
              return (
                <MenuBrowser
                  // A new pin order restarts the menu (active category chip = the new first one)
                  key={`${section.id}:${store.pinnedCategoryIds.join(",")}`}
                  cartKey={cartKey}
                  // Website → Menu: pinned categories first
                  categories={orderCategories(categories, store.pinnedCategoryIds)}
                  layout={asMenuLayout(store.menuLayout)}
                  showSearch={store.showSearch}
                  showDescriptions={store.showDescriptions}
                />
              );
            case "reviews":
              return <ReviewsSection key={section.id} rating={store.rating} reviews={reviews} />;
            case "text":
              return section.title || section.body ? (
                <section key={section.id} className="px-3 py-1.5 sm:px-4">
                  <div className="bg-background rounded-2xl p-4">
                    {section.title && <h2 className="text-lg font-bold">{section.title}</h2>}
                    {section.body && (
                      <p className="text-muted-foreground mt-1 text-sm">
                        <RichText text={section.body} />
                      </p>
                    )}
                  </div>
                </section>
              ) : null;
            case "image": {
              if (!section.imageUrl) return null;
              const img = (
                <span className="relative block aspect-[2/1] overflow-hidden rounded-2xl">
                  <Image
                    src={section.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 672px) 640px, 100vw"
                    className="object-cover"
                  />
                </span>
              );
              return (
                <section key={section.id} className="px-3 py-1.5 sm:px-4">
                  {section.link ? (
                    <a
                      href={section.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {img}
                    </a>
                  ) : (
                    img
                  )}
                </section>
              );
            }
          }
        })}
    </>
  );
}
