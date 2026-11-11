import { themeCss } from "@/lib/design";

/**
 * The store's colors for this page (store menu, checkout, order status).
 * A <style> on :root so dialogs / sheets (portals) get them too; removed on navigation away.
 */
export function StoreTheme({
  brandColor,
  pageBackground,
}: {
  brandColor: string | null;
  pageBackground: string;
}) {
  return <style>{themeCss({ brandColor, pageBackground })}</style>;
}
