import { z } from "zod";

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

const orderFields = {
  customerName: z.string().trim().min(2, "nameRequired").max(80),
  type: z.enum(["PICKUP", "DELIVERY"]),
  zoneId: optionalText(50),
  address: optionalText(300),
  landmark: optionalText(200),
  scheduledFor: scheduledForSchema,
  comment: optionalText(500),
  paymentMethod: z.enum(["CASH", "CARD_ON_DELIVERY", "TRANSFER"]),
};

function refineDelivery(
  data: { type: "PICKUP" | "DELIVERY"; zoneId?: string; address?: string },
  ctx: z.RefinementCtx,
) {
  if (data.type !== "DELIVERY") return;
  if (!data.zoneId) {
    ctx.addIssue({ code: "custom", path: ["zoneId"], message: "zoneRequired" });
  }
  if (!data.address || data.address.length < 3) {
    ctx.addIssue({ code: "custom", path: ["address"], message: "addressRequired" });
  }
}

/** Checkout form (client). Phone in international format with country code. */
export const checkoutFormSchema = z
  .object({
    ...orderFields,
    phone: phoneSchema,
  })
  .superRefine(refineDelivery);

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
    customerPhone: phoneSchema,
    lang: z.enum(["en"]).default("en"),
    items: z.array(cartItemSchema).min(1).max(50),
  })
  .superRefine(refineDelivery);

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

/** Admin "qo'lda buyurtma": do'kon sessiyadan olinadi; ish vaqti va minOrder tekshirilmaydi. */
export const manualOrderSchema = z
  .object({
    ...orderFields,
    customerPhone: phoneSchema,
    lang: z.enum(["en"]).default("en"),
    markPaid: z.boolean().default(false),
    items: z.array(cartItemSchema).min(1).max(50),
  })
  .superRefine(refineDelivery);

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

function buildSettingsSchema(fee: z.ZodNumber, minOrder: z.ZodNumber) {
  const zone = z.object({
    dbId: z.string().max(50).optional(),
    name: z.string().trim().min(1, "nameRequired").max(60, "tooLong"),
    fee,
  });

  return z
    .object({
      name: z.string().trim().min(2, "nameRequired").max(80, "tooLong"),
      logoUrl: z.string().url().max(500).nullable(),
      phone: optionalTrimmed(30),
      address: optionalTrimmed(200),
      landmark: optionalTrimmed(200),

      currency: currencySchema,
      timeZone: timeZoneSchema,

      isOpen: z.boolean(),
      openTime: timeOrEmpty,
      closeTime: timeOrEmpty,

      pickupEnabled: z.boolean(),
      deliveryEnabled: z.boolean(),
      minOrder,
      zones: z.array(zone).max(50),

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
      if (!s2.pickupEnabled && !s2.deliveryEnabled) issue("deliveryEnabled", "noOrderType");
      if (s2.deliveryEnabled && s2.zones.length === 0) issue("zones", "zonesRequired");
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
    zones: v.zones.map((z2) => ({ ...z2, fee: toMinor(z2.fee, v.currency) })),
  };
}

/** Stored settings (minor) -> form default values (major) */
export function settingsToForm(v: StoreSettingsInput): StoreSettingsFormInput {
  return {
    ...v,
    minOrder: toMajor(v.minOrder, v.currency),
    zones: v.zones.map((z2) => ({ ...z2, fee: toMajor(z2.fee, v.currency) })),
  };
}

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
