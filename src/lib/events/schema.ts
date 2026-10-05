import { z } from "zod";

import { contactSchema } from "@/lib/orders/schema";
import { clockTime, isoDate } from "@/lib/reservations/schema";

export const EVENT_TYPES = [
  "birthday",
  "office",
  "dana",
  "wedding",
  "homecoming",
  "other",
] as const;

/** What the enquiry form may send. Dates and guest numbers are checked on the server too. */
export const inquirySchema = z
  .object({
    branchId: z.uuid(),
    eventType: z.enum(EVENT_TYPES),
    service: z.enum(["at_branch", "catering"]),
    date: isoDate,
    time: clockTime.nullable(),
    guests: z.number().int().min(1).max(5000),
    packageId: z
      .string()
      .regex(/^[a-z0-9-]{1,40}$/)
      .nullable(),
    budgetCents: z.number().int().min(0).max(1_000_000_000).nullable(),
    venue: z.string().trim().max(300).nullable(),
    contact: contactSchema,
    notes: z.string().trim().max(1000).nullable(),
    idempotencyKey: z.uuid(),
    turnstileToken: z.string().max(2048).nullable(),
    locale: z.enum(["en", "si", "ta"]),
  })
  .superRefine((value, ctx) => {
    if (value.service === "catering" && !value.venue) {
      ctx.addIssue({ code: "custom", path: ["venue"], message: "venue-required" });
    }
  });

export type InquiryRequest = z.infer<typeof inquirySchema>;
