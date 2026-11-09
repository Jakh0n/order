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
}

export interface StorefrontData {
  store: StorefrontStore;
  categories: MenuCategory[];
}

export type PaymentMethodValue = "CASH" | "CARD_ON_DELIVERY" | "TRANSFER";

export interface CheckoutSettings {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  paymentMethods: PaymentMethodValue[];
  transferDetails: string | null;
  /** Flat delivery fee (minor units) */
  deliveryFee: number;
}
