import { z } from "zod";

import { defaultLocale, locales } from "@/i18n/config";
import {
  CORNER_STYLES,
  FONT_STYLES,
  HEADER_STYLES,
  MENU_LAYOUTS,
  PAGE_BACKGROUNDS,
  SOCIAL_PATTERNS,
  socialHandle,
} from "@/lib/design";
import {
  EMAIL_MODES,
  normalizePromoCode,
  PROMO_CODE_PATTERN,
  TIP_PERCENTS,
} from "@/lib/orders/promo";
import { navLinksSchema, pinnedSchema } from "@/lib/nav";
import { popupSchema } from "@/lib/popup";
import { sectionsSchema } from "@/lib/sections";

import { isValidCurrency, toMajor, toMinor } from "@/lib/money";
import { slugError } from "@/lib/slug";
import { isValidTimeZone } from "@/lib/store-hours";

// Error messages are i18n keys (checkout.errors.*, adminMenu.errors.*, adminSettings.errors.*, signup.errors.*).

/** International phone with country code: "+1 (555) 123-4567" / "0044 20…" -> "+15551234567" */
export function normalizePhone(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^\+[1-9]\d{6,14}$/, "phoneInvalid"));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

/** "13:30" yoki bo'sh (= imkon qadar tez) */
const scheduledForSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined)
  .pipe(
    z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "timeInvalid")
      .optional(),
  );

/** Upper bound for Store.tableCount and an order's table number */
export const MAX_TABLES = 200;

const orderFields = {
  customerName: z.string().trim().min(2, "nameRequired").max(80),
  type: z.enum(["PICKUP", "DELIVERY", "DINE_IN"]),
  /** DINE_IN: table number from the QR code */
  tableNumber: z.number().int().min(1).max(MAX_TABLES).optional(),
  address: optionalText(300),
  landmark: optionalText(200),
  /** From "Use my current location" — both or neither */
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  scheduledFor: scheduledForSchema,
  comment: optionalText(500),
  paymentMethod: z.enum(["CASH", "CARD_ON_DELIVERY", "TRANSFER"]),
  /** When the store asks for it (Store.checkoutEmail); "" = not given */
  customerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .optional()
    .transform((v) => v || undefined)
    .pipe(z.string().email("emailInvalid").optional()),
  /** Tip choice (percent); the server ignores it when the store has tips off */
  tipPercent: z
    .number()
    .int()
    .refine((v) => (TIP_PERCENTS as readonly number[]).includes(v), "invalid")
    .optional(),
  /** Applied promo code (normalized; checked against the DB on the server) */
  promoCode: z
    .string()
    .max(30)
    .optional()
    .transform((v) => (v ? normalizePromoCode(v) : undefined)),
};

type OrderType = "PICKUP" | "DELIVERY" | "DINE_IN";

/**
 * Per-type rules. The phone is raw text here: required (and validated) except at a table,
 * where it is hidden in the form and dropped. normalizeOrderPhone() runs after this.
 */
function refineOrder(phoneKey: "phone" | "customerPhone") {
  return (
    data: { type: OrderType; address?: string; tableNumber?: number } & Record<string, unknown>,
    ctx: z.RefinementCtx,
  ) => {
    if (data.type === "DELIVERY" && (!data.address || data.address.length < 3)) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "addressRequired" });
    }
    if (data.type === "DINE_IN") {
      if (!data.tableNumber) {
        ctx.addIssue({ code: "custom", path: ["tableNumber"], message: "tableRequired" });
      }
    } else if (!phoneSchema.safeParse(data[phoneKey]).success) {
      ctx.addIssue({ code: "custom", path: [phoneKey], message: "phoneInvalid" });
    }
  };
}

/** Normalized phone, or "" for a table order; table number only on DINE_IN */
function normalizeOrder<T extends { type: OrderType; tableNumber?: number }>(
  data: T,
  phoneKey: "phone" | "customerPhone",
): T {
  const dineIn = data.type === "DINE_IN";
  const phone = data[phoneKey as keyof T] as unknown as string;
  return {
    ...data,
    [phoneKey]: dineIn ? "" : normalizePhone(phone),
    tableNumber: dineIn ? data.tableNumber : undefined,
  };
}

const rawPhone = z.string().max(30);

/** Checkout form (client). Phone in international format with country code. */
export const checkoutFormSchema = z
  .object({
    ...orderFields,
    phone: rawPhone,
  })
  .superRefine(refineOrder("phone"))
  .transform((d) => normalizeOrder(d, "phone"));

export type CheckoutFormInput = z.input<typeof checkoutFormSchema>;
export type CheckoutFormData = z.output<typeof checkoutFormSchema>;

export const cartItemSchema = z.object({
  productId: z.string().min(1).max(50),
  quantity: z.number().int().min(1).max(99),
  optionIds: z.array(z.string().min(1).max(50)).max(30).default([]),
});

/** createOrder Server Action kirishi. Narxlar YO'Q — ular serverda bazadan olinadi. */
export const checkoutSchema = z
  .object({
    ...orderFields,
    storeSlug: z.string().min(1).max(100),
    customerPhone: rawPhone,
    lang: z.enum(locales).default(defaultLocale),
    items: z.array(cartItemSchema).min(1).max(50),
  })
  .superRefine(refineOrder("customerPhone"))
  .transform((d) => normalizeOrder(d, "customerPhone"));

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

/** Admin "qo'lda buyurtma": do'kon sessiyadan olinadi; ish vaqti va minOrder tekshirilmaydi. */
export const manualOrderSchema = z
  .object({
    ...orderFields,
    customerPhone: rawPhone,
    lang: z.enum(locales).default(defaultLocale),
    markPaid: z.boolean().default(false),
    items: z.array(cartItemSchema).min(1).max(50),
  })
  .superRefine(refineOrder("customerPhone"))
  .transform((d) => normalizeOrder(d, "customerPhone"));

export type ManualOrderInput = z.input<typeof manualOrderSchema>;

// ---------- Admin: menyu ----------
// Xato xabarlari — "adminMenu.errors.*" kalitlari.

export const categorySchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(60, "tooLong"),
});

// Money: forms work in major units (8.99), the server stores minor units (899).
const majorMoney = (error: string) =>
  z.number({ error }).finite(error).min(0, error).max(100_000_000, error);
const minorMoney = (error: string) =>
  z.number({ error }).int(error).min(0, error).max(10_000_000_000, error);
const majorDelta = z
  .number({ error: "priceInvalid" })
  .finite("priceInvalid")
  .min(-100_000_000, "priceInvalid")
  .max(100_000_000, "priceInvalid");
const minorDelta = z
  .number({ error: "priceInvalid" })
  .int("priceInvalid")
  .min(-10_000_000_000, "priceInvalid")
  .max(10_000_000_000, "priceInvalid");

function buildProductSchema(price: z.ZodNumber, delta: z.ZodNumber) {
  const option = z.object({
    /** DB id (missing for new options). Not "id" — useFieldArray uses its own "id". */
    dbId: z.string().max(50).optional(),
    name: z.string().trim().min(1, "nameRequired").max(60, "tooLong"),
    /** Added to the base price; may be negative (e.g. half portion) */
    price: delta,
  });
  const group = z
    .object({
      dbId: z.string().max(50).optional(),
      name: z.string().trim().min(1, "nameRequired").max(60, "tooLong"),
      required: z.boolean(),
      maxSelect: z.number({ error: "maxSelectInvalid" }).int().min(1, "maxSelectInvalid").max(20),
      options: z.array(option).min(1, "optionsRequired").max(30),
    })
    .refine((g) => g.maxSelect <= g.options.length, {
      path: ["maxSelect"],
      message: "maxSelectInvalid",
    });

  return z
    .object({
      name: z.string().trim().min(1, "nameRequired").max(100, "tooLong"),
      description: z
        .string()
        .trim()
        .max(500, "tooLong")
        .nullish()
        .transform((v) => v || null),
      price,
      categoryId: z.string().min(1, "categoryRequired").max(50),
      isAvailable: z.boolean(),
      imageUrl: z.string().url().max(500).nullable(),
      optionGroups: z.array(group).max(10),
    })
    .superRefine((p, ctx) => {
      // Even the cheapest choice must not make the price negative
      const minExtra = p.optionGroups.reduce((sum, g) => {
        const sorted = g.options.map((o) => o.price).sort((a, b) => a - b);
        const negatives = sorted.filter((x) => x < 0).slice(0, g.maxSelect);
        const worst = negatives.reduce((s2, x) => s2 + x, 0);
        // A required group always adds at least its cheapest option
        return sum + (negatives.length === 0 && g.required ? (sorted[0] ?? 0) : worst);
      }, 0);
      if (p.price + minExtra < 0) {
        ctx.addIssue({ code: "custom", path: ["price"], message: "negativeTotal" });
      }
    });
}

/** Server: amounts in minor units */
export const productSchema = buildProductSchema(minorMoney("priceInvalid"), minorDelta);
/** Product form: amounts in major units */
export const productFormSchema = buildProductSchema(majorMoney("priceInvalid"), majorDelta);

export type ProductInput = z.input<typeof productSchema>;
export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormData = z.output<typeof productFormSchema>;

/** Product form values (major) -> server input (minor) */
export function productFormToMinor(v: ProductFormData, currency: string): ProductInput {
  return {
    ...v,
    price: toMinor(v.price, currency),
    optionGroups: v.optionGroups.map((g) => ({
      ...g,
      options: g.options.map((o) => ({ ...o, price: toMinor(o.price, currency) })),
    })),
  };
}

/** Server/DB product (minor) -> form default values (major) */
export function productToForm(v: ProductInput, currency: string): ProductFormInput {
  return {
    ...v,
    price: toMajor(v.price, currency),
    optionGroups: v.optionGroups.map((g) => ({
      ...g,
      options: g.options.map((o) => ({ ...o, price: toMajor(o.price, currency) })),
    })),
  };
}

// ---------- Admin: do'kon sozlamalari ----------
// Xato xabarlari — "adminSettings.errors.*" kalitlari.

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .nullish()
    .transform((v) => v || null);

const timeOrEmpty = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v || null)
  .pipe(
    z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "timeInvalid")
      .nullable(),
  );

/** "@my_cafe", "t.me/my_cafe", "https://t.me/my_cafe" -> "my_cafe" */
export function normalizeTelegramUsername(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(t\.me|telegram\.me)\//, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
}

const currencySchema = z.string().trim().toUpperCase().refine(isValidCurrency, "currencyInvalid");

const timeZoneSchema = z.string().trim().refine(isValidTimeZone, "timeZoneInvalid");

/** Store page default language */
const storeLocaleSchema = z.enum(locales).catch(defaultLocale);

function buildSettingsSchema(fee: z.ZodNumber, minOrder: z.ZodNumber) {
  return z
    .object({
      phone: optionalTrimmed(30),
      address: optionalTrimmed(200),
      landmark: optionalTrimmed(200),

      currency: currencySchema,
      timeZone: timeZoneSchema,
      locale: storeLocaleSchema,

      isOpen: z.boolean(),
      openTime: timeOrEmpty,
      closeTime: timeOrEmpty,

      pickupEnabled: z.boolean(),
      deliveryEnabled: z.boolean(),
      minOrder,
      /** Flat delivery fee */
      deliveryFee: fee,
      /** Free delivery from this items subtotal; null = off */
      freeDeliveryFrom: fee.nullable(),

      acceptCash: z.boolean(),
      acceptCardOnDelivery: z.boolean(),
      acceptTransfer: z.boolean(),
      transferDetails: optionalTrimmed(500),

      channel: z.enum(["TELEGRAM", "WHATSAPP"]),
      telegramUsername: z
        .string()
        .nullish()
        .transform((v) => (v ? normalizeTelegramUsername(v) : null)),
      whatsappNumber: z
        .string()
        .nullish()
        .transform((v) => (v ? normalizePhone(v) : null)),
    })
    .superRefine((s2, ctx) => {
      const issue = (path: string, message: string) =>
        ctx.addIssue({ code: "custom", path: [path], message });

      if (!!s2.openTime !== !!s2.closeTime) {
        issue(s2.openTime ? "closeTime" : "openTime", "bothTimes");
      }
      // "no order type at all" is checked in saveStoreSettings: table ordering lives on the QR page
      if (!s2.acceptCash && !s2.acceptCardOnDelivery && !s2.acceptTransfer) {
        issue("acceptTransfer", "noPayment");
      }
      if (s2.acceptTransfer && !s2.transferDetails) {
        issue("transferDetails", "transferDetailsRequired");
      }

      if (s2.channel === "TELEGRAM") {
        if (!s2.telegramUsername) issue("telegramUsername", "telegramRequired");
        else if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(s2.telegramUsername)) {
          issue("telegramUsername", "telegramInvalid");
        }
      }
      if (s2.whatsappNumber && !/^\+[1-9]\d{6,14}$/.test(s2.whatsappNumber)) {
        issue("whatsappNumber", "whatsappInvalid");
      } else if (s2.channel === "WHATSAPP" && !s2.whatsappNumber) {
        issue("whatsappNumber", "whatsappRequired");
      }
    });
}

/** Server: amounts in minor units */
export const storeSettingsSchema = buildSettingsSchema(
  minorMoney("feeInvalid"),
  minorMoney("amountInvalid"),
);
/** Settings form: amounts in major units */
export const storeSettingsFormSchema = buildSettingsSchema(
  majorMoney("feeInvalid"),
  majorMoney("amountInvalid"),
);

export type StoreSettingsInput = z.input<typeof storeSettingsSchema>;
export type StoreSettingsFormInput = z.input<typeof storeSettingsFormSchema>;
export type StoreSettingsFormData = z.output<typeof storeSettingsFormSchema>;

/** Form (major, in the currency chosen in the form) -> server input (minor) */
export function settingsFormToMinor(v: StoreSettingsFormData): StoreSettingsInput {
  return {
    ...v,
    minOrder: toMinor(v.minOrder, v.currency),
    deliveryFee: toMinor(v.deliveryFee, v.currency),
    freeDeliveryFrom: v.freeDeliveryFrom === null ? null : toMinor(v.freeDeliveryFrom, v.currency),
  };
}

/** Stored settings (minor) -> form default values (major) */
export function settingsToForm(v: StoreSettingsInput): StoreSettingsFormInput {
  return {
    ...v,
    minOrder: toMajor(v.minOrder, v.currency),
    deliveryFee: toMajor(v.deliveryFee, v.currency),
    freeDeliveryFrom: v.freeDeliveryFrom == null ? null : toMajor(v.freeDeliveryFrom, v.currency),
  };
}

/**
 * Admin promo code form. Money in major units (converted with the store currency on the server).
 * Error messages — "adminPromos.errors.*" keys.
 */
export const promoFormSchema = z
  .object({
    code: z
      .string()
      .transform(normalizePromoCode)
      .pipe(z.string().regex(PROMO_CODE_PATTERN, "codeInvalid")),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.number({ error: "valueInvalid" }).finite("valueInvalid").positive("valueInvalid"),
    minSubtotal: z
      .number({ error: "amountInvalid" })
      .finite("amountInvalid")
      .min(0, "amountInvalid")
      .max(100_000_000, "amountInvalid"),
    maxUses: z
      .number({ error: "maxUsesInvalid" })
      .int("maxUsesInvalid")
      .min(1, "maxUsesInvalid")
      .max(1_000_000, "maxUsesInvalid")
      .nullable(),
    /** "YYYY-MM-DD" (last day the code works, store time zone) or "" */
    expiresOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "dateInvalid"),
  })
  .superRefine((v, ctx) => {
    if (v.type === "PERCENT" && (!Number.isInteger(v.value) || v.value > 100)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "percentInvalid" });
    }
    if (v.type === "FIXED" && v.value > 100_000_000) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "valueInvalid" });
    }
  });

export type PromoFormInput = z.input<typeof promoFormSchema>;
export type PromoFormData = z.output<typeof promoFormSchema>;

/** "@name" / profile URL → "name"; empty → null */
function socialField(pattern: RegExp) {
  return z
    .string()
    .max(100)
    .nullable()
    .transform((v) => (v ? socialHandle(v) : null))
    .refine((v) => v === null || pattern.test(v), "socialInvalid");
}

/** Design page. Error messages — "design.errors.*" keys. */
export const designSchema = z.object({
  name: z.string().trim().min(2, "nameRequired").max(80, "tooLong"),
  logoUrl: z.string().url().max(500).nullable(),
  coverUrl: z.string().url().max(500).nullable(),
  description: z
    .string()
    .trim()
    .max(300, "tooLong")
    .transform((v) => v || null)
    .nullable(),
  announcement: z
    .string()
    .trim()
    .max(160, "tooLong")
    .transform((v) => v || null)
    .nullable(),
  brandColor: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/, "colorInvalid")
    .nullable(),
  pageBackground: z.enum(PAGE_BACKGROUNDS),
  menuLayout: z.enum(MENU_LAYOUTS),
  fontStyle: z.enum(FONT_STYLES),
  cornerStyle: z.enum(CORNER_STYLES),
  headerStyle: z.enum(HEADER_STYLES),
  showSearch: z.boolean(),
  showDescriptions: z.boolean(),
  instagram: socialField(SOCIAL_PATTERNS.instagram),
  telegramChannel: socialField(SOCIAL_PATTERNS.telegramChannel),
  tiktok: socialField(SOCIAL_PATTERNS.tiktok),
  sections: sectionsSchema,
  checkoutEmail: z.enum(EMAIL_MODES),
  checkoutNote: z.boolean(),
  checkoutPromo: z.boolean(),
  tipsEnabled: z.boolean(),
  popup: popupSchema,
  navLinks: navLinksSchema,
  pinnedCategoryIds: pinnedSchema,
});

export type DesignInput = z.input<typeof designSchema>;

/** QR page: table ordering. Error messages — "table.errors.*" keys. */
export const tableSettingsSchema = z
  .object({
    dineInEnabled: z.boolean(),
    tableCount: z
      .number({ error: "tableCountInvalid" })
      .int("tableCountInvalid")
      .min(0, "tableCountInvalid")
      .max(MAX_TABLES, "tableCountInvalid"),
  })
  .superRefine((v, ctx) => {
    if (v.dineInEnabled && v.tableCount < 1) {
      ctx.addIssue({ code: "custom", path: ["tableCount"], message: "tableCountInvalid" });
    }
  });

export type TableSettingsInput = z.input<typeof tableSettingsSchema>;

// ---------- Ro'yxatdan o'tish ----------
// Xato xabarlari — "signup.errors.*" kalitlari.

export const signupAccountSchema = z.object({
  email: z.string().trim().toLowerCase().email("emailInvalid").max(200, "tooLong"),
  password: z.string().min(8, "passwordShort").max(200, "tooLong"),
});

export const signupStoreSchema = z
  .object({
    storeName: z.string().trim().min(2, "storeNameRequired").max(80, "tooLong"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .superRefine((v, ctx) => {
        const error = slugError(v);
        if (error) ctx.addIssue({ code: "custom", message: error });
      }),
    currency: currencySchema,
    /** Detected from the browser; falls back to UTC */
    timeZone: z
      .string()
      .optional()
      .transform((v) => (v && isValidTimeZone(v) ? v : "UTC")),
    /** The language the owner signed up in */
    locale: storeLocaleSchema,
    channel: z.enum(["TELEGRAM", "WHATSAPP"]),
    telegramUsername: z
      .string()
      .nullish()
      .transform((v) => (v ? normalizeTelegramUsername(v) : null)),
    whatsappNumber: z
      .string()
      .nullish()
      .transform((v) => (v ? normalizePhone(v) : null)),
  })
  .superRefine((s, ctx) => {
    if (
      s.channel === "TELEGRAM" &&
      !/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(s.telegramUsername ?? "")
    ) {
      ctx.addIssue({ code: "custom", path: ["telegramUsername"], message: "telegramInvalid" });
    }
    if (s.channel === "WHATSAPP" && !/^\+[1-9]\d{6,14}$/.test(s.whatsappNumber ?? "")) {
      ctx.addIssue({ code: "custom", path: ["whatsappNumber"], message: "whatsappInvalid" });
    }
  });

export const signupSchema = z.object({
  ...signupAccountSchema.shape,
  store: signupStoreSchema,
});

export type SignupInput = z.input<typeof signupSchema>;
