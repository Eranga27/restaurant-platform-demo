import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/**
 * Saved delivery addresses, read and written as the signed-in customer: RLS
 * limits each account to its own (at most 10, enforced by the database).
 */

export const addressInput = z.object({
  label: z.string().trim().min(1).max(40),
  district: z.string().trim().min(1).max(40),
  city: z.string().trim().min(1).max(80),
  line: z.string().trim().min(3).max(300),
  landmark: z.string().trim().max(200).nullable(),
  lat: z.number().min(5.8).max(10),
  lng: z.number().min(79.5).max(82),
});

export type SavedAddress = z.infer<typeof addressInput> & { id: string };

const row = z.object({
  id: z.uuid(),
  label: z.string(),
  district: z.string(),
  city: z.string(),
  line: z.string(),
  landmark: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
});

export async function getSavedAddresses(): Promise<SavedAddress[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, district, city, line, landmark, lat, lng")
    .order("created_at");
  if (error) return [];
  return z.array(row).parse(data ?? []);
}

/** Adds an address for the signed-in customer. Throws when it can't be saved. */
export async function saveAddress(input: z.input<typeof addressInput>): Promise<void> {
  const address = addressInput.parse(input);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not signed in");
  const { error } = await supabase.from("addresses").insert({ ...address, user_id: auth.user.id });
  if (error) throw new Error(error.message);
}
