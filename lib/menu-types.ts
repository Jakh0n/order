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
  phone: string | null;
  address: string | null;
  openTime: string | null;
  closeTime: string | null;
  isOpen: boolean;
  /** Superadmin bloklagan — menyu va buyurtma yopiq */
  isBlocked: boolean;
  minOrder: number;
}

export interface StorefrontData {
  store: StorefrontStore;
  categories: MenuCategory[];
}

export interface DeliveryZoneOption {
  id: string;
  name: string;
  fee: number;
}

export type PaymentMethodValue = "CASH" | "CARD_ON_DELIVERY" | "TRANSFER";

export interface CheckoutSettings {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  paymentMethods: PaymentMethodValue[];
  transferDetails: string | null;
  zones: DeliveryZoneOption[];
}
