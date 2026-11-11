import type { NavLink } from "@/lib/nav";
import type { Popup } from "@/lib/popup";
import type { Section } from "@/lib/sections";

// Server → klient uzatiladigan menyu tiplari (faqat serializable maydonlar).

export interface MenuOption {
  id: string;
  name: string;
  price: number;
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  required: boolean;
  maxSelect: number;
  options: MenuOption[];
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  /** false = "Sold out today": shown greyed out, can't be added */
  isAvailable: boolean;
  optionGroups: MenuOptionGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  products: MenuProduct[];
}

export interface StorefrontStore {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  /** Wide header photo (optional) */
  coverUrl: string | null;
  /** Short text under the name (**bold**, _italic_, ~~strike~~) */
  description: string | null;
  /** Banner at the top of the store page */
  announcement: string | null;
  /** Design (lib/design.ts) */
  brandColor: string | null;
  pageBackground: string;
  menuLayout: string;
  fontStyle: string;
  cornerStyle: string;
  headerStyle: string;
  showSearch: boolean;
  showDescriptions: boolean;
  /** Visible reviews: average 1..5 and how many (header stars) */
  rating: { average: number; count: number };
  /** Website → Menu (lib/nav.ts), already validated */
  navLinks: NavLink[];
  pinnedCategoryIds: string[];
  /** One-time popup (lib/popup.ts), already validated */
  popup: Popup;
  /** Ordered page sections (lib/sections.ts), already validated */
  sections: Section[];
  /** Social usernames (no @) */
  instagram: string | null;
  telegramChannel: string | null;
  tiktok: string | null;
  phone: string | null;
  address: string | null;
  openTime: string | null;
  closeTime: string | null;
  isOpen: boolean;
  /** Superadmin bloklagan — menyu va buyurtma yopiq */
  isBlocked: boolean;
  minOrder: number;
  /** ISO 4217; money amounts are in its minor unit */
  currency: string;
  /** IANA time zone for opening hours */
  timeZone: string;
  deliveryEnabled: boolean;
  /** Flat delivery fee (minor units) */
  deliveryFee: number;
  /** Free delivery from this items subtotal (minor units); null = off */
  freeDeliveryFrom: number | null;
  /** Free plan: small "Made with Flami" link on the store page */
  showBranding: boolean;
  /** Table QR ordering; valid tables are 1..tableCount */
  dineInEnabled: boolean;
  tableCount: number;
}

export interface StorefrontData {
  store: StorefrontStore;
  categories: MenuCategory[];
  /** Latest visible reviews with a comment (Reviews section) */
  reviews: { id: string; rating: number; comment: string; name: string; createdAt: Date }[];
}

export type PaymentMethodValue = "CASH" | "CARD_ON_DELIVERY" | "TRANSFER";

export interface CheckoutSettings {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  paymentMethods: PaymentMethodValue[];
  transferDetails: string | null;
  /** Flat delivery fee (minor units) */
  deliveryFee: number;
  /** Free delivery from this items subtotal; null = off */
  freeDeliveryFrom: number | null;
  /** Promo field shown: Pro + active codes + Website → Checkout switch */
  hasPromoCodes: boolean;
  /** Website → Checkout */
  emailField: "off" | "optional" | "required";
  showNote: boolean;
  tipsEnabled: boolean;
}
