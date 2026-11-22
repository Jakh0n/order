import type { Prisma } from "@prisma/client";

import {
  asCornerStyle,
  asFontStyle,
  asHeaderStyle,
  asMenuLayout,
  asPageBackground,
} from "@/lib/design";
import { parseNavLinks, parsePinned } from "@/lib/nav";
import { asEmailMode } from "@/lib/orders/promo";
import { parsePopup } from "@/lib/popup";
import { parseSections } from "@/lib/sections";
import type { DesignInput } from "@/lib/validators";

/** Store columns the Website editor edits (one list for the page and saveDesign) */
export const DESIGN_SELECT = {
  name: true,
  logoUrl: true,
  coverUrl: true,
  description: true,
  announcement: true,
  brandColor: true,
  pageBackground: true,
  menuLayout: true,
  fontStyle: true,
  cornerStyle: true,
  headerStyle: true,
  showSearch: true,
  showDescriptions: true,
  instagram: true,
  telegramChannel: true,
  tiktok: true,
  sections: true,
  checkoutEmail: true,
  checkoutNote: true,
  checkoutPromo: true,
  tipsEnabled: true,
  popup: true,
  navLinks: true,
  pinnedCategoryIds: true,
} satisfies Prisma.StoreSelect;

export type DesignRow = Prisma.StoreGetPayload<{ select: typeof DESIGN_SELECT }>;

/** Database row → the editor's form values */
export function designFormValues(design: DesignRow): DesignInput {
  return {
    ...design,
    description: design.description ?? "",
    announcement: design.announcement ?? "",
    instagram: design.instagram ?? "",
    telegramChannel: design.telegramChannel ?? "",
    tiktok: design.tiktok ?? "",
    pageBackground: asPageBackground(design.pageBackground),
    menuLayout: asMenuLayout(design.menuLayout),
    fontStyle: asFontStyle(design.fontStyle),
    cornerStyle: asCornerStyle(design.cornerStyle),
    headerStyle: asHeaderStyle(design.headerStyle),
    sections: parseSections(design.sections),
    checkoutEmail: asEmailMode(design.checkoutEmail),
    popup: parsePopup(design.popup),
    navLinks: parseNavLinks(design.navLinks),
    pinnedCategoryIds: parsePinned(design.pinnedCategoryIds),
  };
}
