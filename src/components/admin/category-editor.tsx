"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { saveCategoryAction } from "@/app/(staff)/admin/menu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AdminCategory } from "@/lib/admin/menu";

import { I18nFields, slugify, toI18nValue, type I18nValue } from "./i18n-fields";

type Draft = {
  id: string | null;
  slug: string;
  name: I18nValue;
  isActive: boolean;
  sortOrder: number;
};

const fromCategory = (c: AdminCategory): Draft => ({
  id: c.id,
  slug: c.slug,
  name: toI18nValue(c.name_i18n),
  isActive: c.is_active,
  sortOrder: c.sort_order,
});

/** Edit categories in place, or add one. */
export function CategoryEditor({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!editing) return;
    setBusy(true);
    const result = await saveCategoryAction({
      ...editing,
      slug: editing.slug || slugify(editing.name.en),
    }).catch(() => ({ ok: false as const, error: "Something went wrong." }));
    setBusy(false);
    if (!result.ok) return toast.error(result.error);
    toast.success("Category saved.");
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-xl border">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span>
              <span className="font-medium">{c.name_i18n.en}</span>{" "}
              <span className="text-muted-foreground">
                #{c.sort_order}
                {c.is_active ? "" : " · hidden"}
              </span>
            </span>
            <Button size="sm" variant="ghost" onClick={() => setEditing(fromCategory(c))}>
              Edit
            </Button>
          </li>
        ))}
      </ul>
      {editing ? (
        <div className="space-y-4 rounded-xl border p-4">
          <I18nFields
            id="category-name"
            label="Name"
            required
            value={editing.name}
            onChange={(name) => setEditing({ ...editing, name })}
          />
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="category-slug" className="text-xs">
                Link name
              </Label>
              <Input
                id="category-slug"
                value={editing.slug}
                placeholder={slugify(editing.name.en)}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className="w-48"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category-order" className="text-xs">
                Order
              </Label>
              <Input
                id="category-order"
                type="number"
                min={0}
                value={editing.sortOrder}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })}
                className="w-24"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={editing.isActive}
                onCheckedChange={(isActive) => setEditing({ ...editing, isActive })}
              />
              Shown on the menu
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy || !editing.name.en.trim()}>
              Save category
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() =>
            setEditing({
              id: null,
              slug: "",
              name: { en: "", si: "", ta: "" },
              isActive: true,
              sortOrder: (categories.at(-1)?.sort_order ?? 0) + 1,
            })
          }
        >
          Add category
        </Button>
      )}
    </div>
  );
}
