import { z } from "zod";

import { contactSchema } from "@/lib/orders/schema";

/** What the booking form may send. Times are checked again on the server. */

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const availabilityRequestSchema = z.object({
  branchId: z.uuid(),
  date: isoDate,
  partySize: z.number().int().min(1).max(50),
});

export const bookingSchema = availabilityRequestSchema.extend({
  time: clockTime,
  seating: z.enum(["any", "indoor", "outdoor"]),
  occasion: z.enum(["birthday", "anniversary", "business", "other"]).nullable(),
  contact: contactSchema,
  notes: z.string().trim().max(500).nullable(),
  idempotencyKey: z.uuid(),
  turnstileToken: z.string().max(2048).nullable(),
  locale: z.enum(["en", "si", "ta"]),
});

export type AvailabilityRequest = z.infer<typeof availabilityRequestSchema>;
export type BookingRequest = z.infer<typeof bookingSchema>;
