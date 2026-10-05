import { z } from "zod";

import { normalizeSriLankanPhone } from "@/lib/phone";

/**
 * What the browser may send. The cart is only item IDs, chosen option IDs and
 * quantities (docs/SECURITY.md principle 4): names and prices are always
 * looked up again on the server.
 */

export const MAX_LINES = 40;
export const MAX_QUANTITY = 20;

export const cartLineSchema = z.object({
  menuItemId: z.uuid(),
  selection: z.record(z.uuid(), z.array(z.uuid()).max(20)),
  spiceLevel: z.enum(["mild", "medium", "hot"]).nullable(),
  instructions: z.string().trim().max(200).nullable(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});

export const locationSchema = z.object({
  lat: z.number().min(5.8).max(10),
  lng: z.number().min(79.5).max(82),
});

const promoCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{3,20}$/);

export const quoteRequestSchema = z.object({
  branchId: z.uuid(),
  type: z.enum(["delivery", "pickup"]),
  lines: z.array(cartLineSchema).min(1).max(MAX_LINES),
  promoCode: promoCode.nullable(),
  location: locationSchema.nullable(),
  /** ISO timestamp with offset, or null for "as soon as possible". */
  scheduledFor: z.iso.datetime({ offset: true }).nullable(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const e164 = normalizeSriLankanPhone(value);
      if (!e164) {
        ctx.addIssue({ code: "custom", message: "invalid-phone" });
        return z.NEVER;
      }
      return e164;
    }),
  email: z.email().max(254),
});

export const addressSchema = z.object({
  district: z.string().trim().min(1).max(40),
  city: z.string().trim().min(1).max(80),
  line: z.string().trim().min(3).max(300),
  landmark: z.string().trim().max(200).nullable(),
});

export const checkoutSchema = quoteRequestSchema
  .extend({
    contact: contactSchema,
    address: addressSchema.nullable(),
    notes: z.string().trim().max(500).nullable(),
    paymentMethod: z.enum(["cod", "payhere"]),
    idempotencyKey: z.uuid(),
    turnstileToken: z.string().max(2048).nullable(),
    locale: z.enum(["en", "si", "ta"]),
  })
  .superRefine((value, ctx) => {
    if (value.type === "delivery" && (!value.address || !value.location)) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "address-required" });
    }
  });

export type CartLineInput = z.infer<typeof cartLineSchema>;
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type CheckoutRequest = z.infer<typeof checkoutSchema>;
