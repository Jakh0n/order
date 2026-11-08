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
