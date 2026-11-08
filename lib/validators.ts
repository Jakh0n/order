import { z } from "zod";

// Xato xabarlari — "checkout.errors.*" i18n kalitlari.

/** "+998 90 123-45-67" -> "+998901234567" */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+998\d{9}$/, "phoneInvalid"));

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

/** Checkout formasi (klient). Telefon — +998 dan keyingi 9 raqam. */
export const checkoutFormSchema = z
  .object({
    ...orderFields,
    phoneDigits: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{9}$/, "phoneInvalid")),
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
    lang: z.enum(["uz", "ru"]).default("uz"),
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
    lang: z.enum(["uz", "ru"]).default("uz"),
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

const moneySchema = z
  .number({ error: "priceInvalid" })
  .int("priceInvalid")
  .min(0, "priceInvalid")
  .max(100_000_000, "priceInvalid");

export const optionSchema = z.object({
  /** Bazadagi id (yangi variantda yo'q). "id" emas — useFieldArray o'z "id" sini ishlatadi. */
  dbId: z.string().max(50).optional(),
  name: z.string().trim().min(1, "nameRequired").max(60, "tooLong"),
  /** Asosiy narxga qo'shiladi; manfiy bo'lishi mumkin (masalan, yarim porsiya) */
  price: z
    .number({ error: "priceInvalid" })
    .int("priceInvalid")
    .min(-100_000_000, "priceInvalid")
    .max(100_000_000, "priceInvalid"),
});

export const optionGroupSchema = z
  .object({
    dbId: z.string().max(50).optional(),
    name: z.string().trim().min(1, "nameRequired").max(60, "tooLong"),
    required: z.boolean(),
    maxSelect: z.number({ error: "maxSelectInvalid" }).int().min(1, "maxSelectInvalid").max(20),
    options: z.array(optionSchema).min(1, "optionsRequired").max(30),
  })
  .refine((g) => g.maxSelect <= g.options.length, {
    path: ["maxSelect"],
    message: "maxSelectInvalid",
  });

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "nameRequired").max(100, "tooLong"),
    description: z
      .string()
      .trim()
      .max(500, "tooLong")
      .nullish()
      .transform((v) => v || null),
    price: moneySchema,
    categoryId: z.string().min(1, "categoryRequired").max(50),
    isAvailable: z.boolean(),
    imageUrl: z.string().url().max(500).nullable(),
    optionGroups: z.array(optionGroupSchema).max(10),
  })
  .superRefine((p, ctx) => {
    // Eng arzon tanlovda ham narx manfiy bo'lmasin: har guruhdan eng manfiy maxSelect ta variant
    const minExtra = p.optionGroups.reduce((sum, g) => {
      const sorted = g.options.map((o) => o.price).sort((a, b) => a - b);
      const negatives = sorted.filter((x) => x < 0).slice(0, g.maxSelect);
      const worst = negatives.reduce((s, x) => s + x, 0);
      // Majburiy guruhda manfiy variant bo'lmasa ham, eng arzoni baribir tanlanadi
      return sum + (negatives.length === 0 && g.required ? (sorted[0] ?? 0) : worst);
    }, 0);
    if (p.price + minExtra < 0) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "negativeTotal" });
    }
  });

export type ProductFormInput = z.input<typeof productSchema>;
export type ProductFormData = z.output<typeof productSchema>;

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

export const zoneSchema = z.object({
  dbId: z.string().max(50).optional(),
  name: z.string().trim().min(1, "nameRequired").max(60, "tooLong"),
  fee: z
    .number({ error: "feeInvalid" })
    .int("feeInvalid")
    .min(0, "feeInvalid")
    .max(10_000_000, "feeInvalid"),
});

export const storeSettingsSchema = z
  .object({
    name: z.string().trim().min(2, "nameRequired").max(80, "tooLong"),
    logoUrl: z.string().url().max(500).nullable(),
    phone: optionalTrimmed(30),
    address: optionalTrimmed(200),
    landmark: optionalTrimmed(200),

    isOpen: z.boolean(),
    openTime: timeOrEmpty,
    closeTime: timeOrEmpty,

    pickupEnabled: z.boolean(),
    deliveryEnabled: z.boolean(),
    minOrder: z
      .number({ error: "amountInvalid" })
      .int("amountInvalid")
      .min(0, "amountInvalid")
      .max(100_000_000, "amountInvalid"),
    zones: z.array(zoneSchema).max(50),

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
      .transform((v) => {
        const digits = (v ?? "").replace(/\D/g, "");
        return digits ? `+${digits}` : null;
      }),
  })
  .superRefine((s, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (!!s.openTime !== !!s.closeTime) issue(s.openTime ? "closeTime" : "openTime", "bothTimes");
    if (!s.pickupEnabled && !s.deliveryEnabled) issue("deliveryEnabled", "noOrderType");
    if (s.deliveryEnabled && s.zones.length === 0) issue("zones", "zonesRequired");
    if (!s.acceptCash && !s.acceptCardOnDelivery && !s.acceptTransfer) {
      issue("acceptTransfer", "noPayment");
    }
    if (s.acceptTransfer && !s.transferDetails) issue("transferDetails", "transferDetailsRequired");

    if (s.channel === "TELEGRAM") {
      if (!s.telegramUsername) issue("telegramUsername", "telegramRequired");
      else if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(s.telegramUsername)) {
        issue("telegramUsername", "telegramInvalid");
      }
    }
    if (s.whatsappNumber && !/^\+\d{9,15}$/.test(s.whatsappNumber)) {
      issue("whatsappNumber", "whatsappInvalid");
    } else if (s.channel === "WHATSAPP" && !s.whatsappNumber) {
      issue("whatsappNumber", "whatsappRequired");
    }
  });

export type StoreSettingsInput = z.input<typeof storeSettingsSchema>;
export type StoreSettingsData = z.output<typeof storeSettingsSchema>;
