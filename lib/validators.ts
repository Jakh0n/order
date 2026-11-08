import { z } from "zod";

export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+998\d{9}$/, "phone.invalid"));

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  optionIds: z.array(z.string().min(1)).default([]),
});

export const checkoutSchema = z
  .object({
    storeSlug: z.string().min(1),
    customerName: z.string().trim().min(2).max(80),
    customerPhone: phoneSchema,
    type: z.enum(["PICKUP", "DELIVERY"]),
    zoneId: z.string().optional(),
    address: z.string().trim().max(300).optional(),
    landmark: z.string().trim().max(200).optional(),
    scheduledFor: z.string().trim().max(50).optional(),
    comment: z.string().trim().max(500).optional(),
    paymentMethod: z.enum(["CASH", "CARD_ON_DELIVERY", "TRANSFER"]),
    lang: z.enum(["uz", "ru"]).default("uz"),
    items: z.array(cartItemSchema).min(1).max(50),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "DELIVERY") return;
    if (!data.zoneId) {
      ctx.addIssue({ code: "custom", path: ["zoneId"], message: "zone.required" });
    }
    if (!data.address || data.address.length < 3) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "address.required" });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;
