"use client";

import { useState } from "react";
import { toast } from "sonner";

import { setAvailabilityAction } from "@/app/(staff)/dashboard/actions";
import { Switch } from "@/components/ui/switch";
import type { MenuAvailability } from "@/lib/dashboard/data";

export function AvailabilityList({ branchId, menu }: { branchId: string; menu: MenuAvailability }) {
  const [available, setAvailable] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(menu.flatMap((c) => c.items.map((i) => [i.id, i.available]))),
  );
  const [busy, setBusy] = useState<string | null>(null);

  async function change(id: string, name: string, next: boolean) {
    setBusy(id);
    setAvailable((a) => ({ ...a, [id]: next }));
    const result = await setAvailabilityAction({ branchId, menuItemId: id, available: next }).catch(
      () => ({ ok: false as const }),
    );
    setBusy(null);
    if (!result.ok) {
      setAvailable((a) => ({ ...a, [id]: !next }));
      toast.error(`Couldn't update ${name}. Please try again.`);
    } else toast.success(next ? `${name} is back on the menu.` : `${name} is sold out.`);
  }

  const soldOut = Object.values(available).filter((v) => !v).length;

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium">
        {soldOut === 0 ? "Everything is available." : `${soldOut} sold out.`}
      </p>
      {menu.map((category) => (
        <section key={category.categoryName} className="rounded-2xl border bg-card p-4 shadow-soft">
          <h2 className="mb-2 font-display text-lg text-primary">{category.categoryName}</h2>
          <ul className="divide-y">
            {category.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-2.5">
                <label htmlFor={`item-${item.id}`} className="text-sm">
                  {item.name}
                  {!available[item.id] && (
                    <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      Sold out
                    </span>
                  )}
                </label>
                <Switch
                  id={`item-${item.id}`}
                  checked={available[item.id] ?? true}
                  disabled={busy === item.id}
                  onCheckedChange={(next) => change(item.id, item.name, next)}
                  aria-label={`${item.name} available`}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
