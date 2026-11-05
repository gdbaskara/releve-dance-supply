/**
 * Zod schemas shared by server actions and (optionally) client forms.
 * PURE & CLIENT-SAFE: no DB / server imports here.
 * PaymentMethod enum intentionally has exactly QRIS | EWALLET | VA | CARD (no cash-on-delivery, no installments).
 */
import { z } from "zod";
import { normalizePhoneID } from "@/lib/format/phone";
import { JAVA_PROVINCES } from "@/lib/data/areas";

export const localeSchema = z.enum(["id", "en"]);
export const paymentMethodSchema = z.enum(["QRIS", "EWALLET", "VA", "CARD"]);
export const ewalletChannelSchema = z.enum(["GOPAY", "OVO", "DANA", "SHOPEEPAY"]);
export const vaChannelSchema = z.enum(["BCA", "MANDIRI", "BNI", "BRI", "PERMATA"]);
export const paymentChannelSchema = z.union([ewalletChannelSchema, vaChannelSchema]);

export const orderStatusSchema = z.enum([
  "PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "EXPIRED", "CANCELLED", "REFUND_PENDING",
]);

/** Accepts 0812-3456-7890 / 62812… / +62 812… and outputs E.164 (+6281234567890). */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizePhoneID(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "INVALID_WA" });
      return z.NEVER;
    }
    return n;
  });

export const skuSchema = z.string().trim().min(1).max(80);
export const cartItemSchema = z.object({ sku: skuSchema, qty: z.number().int().min(1).max(99) });
export const cartItemsSchema = z.array(cartItemSchema).min(1).max(50);

/** validateCart input — qty 0 is allowed (line removed); optional isPreorder lets the server emit NOW_PREORDER. */
export const cartValidateItemsSchema = z
  .array(z.object({ sku: skuSchema, qty: z.number().int().min(0).max(99), isPreorder: z.boolean().optional() }))
  .max(50);

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  wa: phoneSchema,
  email: z.union([z.string().trim().email().max(200), z.literal("")]).optional().transform((v) => v || undefined),
  waOptIn: z.boolean(),
});

/** Province is free text here so that a non-Java province maps to OUTSIDE_JAVA (not a generic validation error). */
export const addressInputSchema = z.object({
  province: z.string().trim().min(1),
  city: z.string().trim().min(1),
  district: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().regex(/^\d{5}$/),
  line: z.string().trim().min(5).max(300),
  note: z.string().trim().max(200).optional(),
});

export const shippingAddressSchema = z.object({
  province: z.string().trim().min(1),
  city: z.string().trim().min(1),
  postalCode: z.string().trim().regex(/^\d{5}$/).optional(),
});

export const createOrderInputSchema = z
  .object({
    locale: localeSchema,
    contact: contactSchema,
    address: addressInputSchema,
    shippingServiceCode: z.string().trim().min(1),
    insured: z.boolean(),
    method: paymentMethodSchema,
    channel: paymentChannelSchema.optional(),
    items: z.array(cartItemSchema).max(50),
    voucherCode: z.string().trim().max(40).optional(),
    checkoutLinkToken: z.string().trim().max(100).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.checkoutLinkToken && v.items.length === 0) ctx.addIssue({ code: "custom", path: ["items"], message: "EMPTY_CART" });
    if (v.method === "VA" && !vaChannelSchema.safeParse(v.channel).success)
      ctx.addIssue({ code: "custom", path: ["channel"], message: "VA_CHANNEL_REQUIRED" });
    if (v.method === "EWALLET" && !ewalletChannelSchema.safeParse(v.channel).success)
      ctx.addIssue({ code: "custom", path: ["channel"], message: "EWALLET_CHANNEL_REQUIRED" });
  });

export const paymentSelectionSchema = z
  .object({ method: paymentMethodSchema, channel: paymentChannelSchema.optional() })
  .superRefine((v, ctx) => {
    if (v.method === "VA" && !vaChannelSchema.safeParse(v.channel).success)
      ctx.addIssue({ code: "custom", path: ["channel"], message: "VA_CHANNEL_REQUIRED" });
    if (v.method === "EWALLET" && !ewalletChannelSchema.safeParse(v.channel).success)
      ctx.addIssue({ code: "custom", path: ["channel"], message: "EWALLET_CHANNEL_REQUIRED" });
  });

export const orderNoSchema = z.string().trim().toUpperCase().regex(/^RDS-\d{6}-[0-9A-Z]{4}$/);
export const waLast4Schema = z.string().trim().regex(/^\d{4}$/);

export { JAVA_PROVINCES };
