import { themeCss } from "@/lib/design";

/**
 * The store's colors for this page (store menu, checkout, order status).
 * A <style> on :root so dialogs / sheets (portals) get them too; removed on navigation away.
 */
export function StoreTheme(theme: {
  brandColor: string | null;
  pageBackground: string;
  fontStyle: string;
  cornerStyle: string;
}) {
  return <style>{themeCss(theme)}</style>;
}
