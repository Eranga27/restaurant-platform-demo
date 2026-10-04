import "server-only";

import { cache } from "react";
import { z } from "zod";

import { createPublicClient } from "@/lib/supabase/public";

export type DistrictOption = { name: string; cities: string[] };

const districtRows = z.array(z.object({ name: z.string(), sort_order: z.number() }));
const cityRows = z.array(z.object({ district: z.string(), name: z.string() }));

/** Districts with their main towns, for address forms. Empty without a database. */
export const getDistricts = cache(async (): Promise<DistrictOption[]> => {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const [districts, cities] = await Promise.all([
    supabase.from("districts").select("name, sort_order").order("sort_order"),
    supabase.from("cities").select("district, name").order("name"),
  ]);
  if (districts.error) throw new Error(`Failed to load districts: ${districts.error.message}`);
  if (cities.error) throw new Error(`Failed to load cities: ${cities.error.message}`);
  const byDistrict = Map.groupBy(cityRows.parse(cities.data), (c) => c.district);
  return districtRows.parse(districts.data).map((d) => ({
    name: d.name,
    cities: (byDistrict.get(d.name) ?? []).map((c) => c.name),
  }));
});
