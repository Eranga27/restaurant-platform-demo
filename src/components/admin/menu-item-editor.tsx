"use client";

import { Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  deleteOptionAction,
  deleteOptionValueAction,
  removeMenuImageAction,
  saveMenuItemAction,
  saveOptionAction,
  saveOptionValueAction,
  saveOverridesAction,
  uploadMenuImageAction,
} from "@/app/(staff)/admin/menu/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AdminMenuItem, AdminOption, AdminOverride } from "@/lib/admin/menu";

import { Panel } from "./admin-shell";
import { I18nFields, slugify, toI18nValue, type I18nValue } from "./i18n-fields";

const TAGS = [
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["halal", "Halal"],
  ["contains-nuts", "Contains nuts"],
] as const;

/** "1650" or "1650.50" (rupees) → cents; "" → null. */
function toCents(value: string): number | null {
  const v = value.trim();
  if (v === "") return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(v)) return NaN;
  return Math.round(Number(v) * 100);
}
const toRupees = (cents: number | null) => (cents === null ? "" : String(cents / 100));

type Result = { ok: true; id?: string } | { ok: false; error: string };

async function run(action: () => Promise<Result>, success: string): Promise<Result> {
  const result = await action().catch((): Result => ({
    ok: false,
    error: "Something went wrong.",
  }));
  if (result.ok) toast.success(success);
  else toast.error(result.error);
  return result;
}

export function MenuItemEditor({
  categories,
  branches,
  item,
  imageUrl,
  options,
  overrides,
}: {
  categories: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  item: AdminMenuItem | null;
  imageUrl: string | null;
  options: AdminOption[];
  overrides: AdminOverride[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState<I18nValue>(toI18nValue(item?.name_i18n));
  const [description, setDescription] = useState<I18nValue>(toI18nValue(item?.description_i18n));
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [categoryId, setCategoryId] = useState(item?.category_id ?? categories[0]?.id ?? "");
  const [price, setPrice] = useState(toRupees(item?.base_price_cents ?? null));
  const [tags, setTags] = useState<string[]>(item?.dietary_tags ?? []);
  const [spice, setSpice] = useState(item?.spice_selectable ?? false);
  const [alcohol, setAlcohol] = useState(item?.is_alcohol ?? false);
  const [signature, setSignature] = useState(item?.is_signature ?? false);
  const [active, setActive] = useState(item?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(item?.sort_order ?? 0);

  const priceCents = toCents(price);
  const valid =
    name.en.trim().length > 0 &&
    priceCents !== null &&
    !Number.isNaN(priceCents) &&
    priceCents >= 0;

  async function saveDetails() {
    setBusy(true);
    const result = await run(
      () =>
        saveMenuItemAction({
          id: item?.id ?? null,
          categoryId,
          slug: slug || slugify(name.en),
          name,
          description,
          basePriceCents: priceCents,
          dietaryTags: tags,
          spiceSelectable: spice,
          isAlcohol: alcohol,
          isSignature: signature,
          isActive: active,
          sortOrder,
        }),
      item ? "Dish saved." : "Dish added. Now add a photo and options.",
    );
    setBusy(false);
    if (result.ok && !item && result.id) router.replace(`/admin/menu/${result.id}`);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <Panel title="Details">
        <I18nFields id="name" label="Name" required value={name} onChange={setName} />
        <I18nFields
          id="description"
          label="Description"
          multiline
          value={description}
          onChange={setDescription}
        />
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="price">Price (Rs.)</Label>
            <Input
              id="price"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-invalid={
                price !== "" && (priceCents === null || Number.isNaN(priceCents)) ? true : undefined
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="slug">Link name</Label>
            <Input
              id="slug"
              value={slug}
              placeholder={slugify(name.en)}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sort">Order in category</Label>
            <Input
              id="sort"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {TAGS.map(([tag, label]) => (
            <label key={tag} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={tags.includes(tag)}
                onCheckedChange={(checked) =>
                  setTags((t) => (checked ? [...t, tag] : t.filter((x) => x !== tag)))
                }
              />
              {label}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={spice} onCheckedChange={setSpice} /> Guests choose the spice level
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={alcohol} onCheckedChange={setAlcohol} /> Alcohol (not sold on Poya
            days)
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={signature} onCheckedChange={setSignature} /> Signature dish
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} /> Shown on the menu
          </label>
        </div>
        <Button onClick={saveDetails} disabled={busy || !valid}>
          {busy && <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />}
          {item ? "Save details" : "Add dish"}
        </Button>
      </Panel>

      {item && (
        <>
          <PhotoPanel itemId={item.id} imageUrl={imageUrl} name={name.en} />
          <BranchPanel
            itemId={item.id}
            branches={branches}
            overrides={overrides}
            basePrice={item.base_price_cents}
          />
          <OptionsPanel itemId={item.id} options={options} />
        </>
      )}
    </div>
  );
}

function PhotoPanel({
  itemId,
  imageUrl,
  name,
}: {
  itemId: string;
  imageUrl: string | null;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Images must be 3 MB or smaller.");
    const form = new FormData();
    form.set("itemId", itemId);
    form.set("image", file);
    setBusy(true);
    await run(() => uploadMenuImageAction(form), "Photo updated.");
    setBusy(false);
    router.refresh();
  }

  return (
    <Panel
      title="Photo"
      description="JPEG, PNG, WebP or AVIF, up to 3 MB. Square or 4:3 looks best."
    >
      <div className="flex flex-wrap items-center gap-4">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            width={160}
            height={120}
            className="h-30 w-40 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-30 w-40 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
            No photo
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="photo" className="sr-only">
            Choose a photo
          </Label>
          <Input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={busy}
            onChange={(e) => upload(e.target.files?.[0])}
          />
          {imageUrl && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await run(() => removeMenuImageAction(itemId), "Photo removed.");
                setBusy(false);
                router.refresh();
              }}
            >
              Remove photo
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

function BranchPanel({
  itemId,
  branches,
  overrides,
  basePrice,
}: {
  itemId: string;
  branches: { id: string; name: string }[];
  overrides: AdminOverride[];
  basePrice: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(() =>
    branches.map((b) => {
      const o = overrides.find((x) => x.branch_id === b.id);
      return {
        branchId: b.id,
        name: b.name,
        price: toRupees(o?.price_cents ?? null),
        isAvailable: o?.is_available ?? true,
      };
    }),
  );
  const [busy, setBusy] = useState(false);
  const invalid = rows.some((r) => Number.isNaN(toCents(r.price)));

  return (
    <Panel
      title="Prices and availability by branch"
      description={`Leave the price empty to use the menu price (Rs. ${basePrice / 100}).`}
    >
      <ul className="divide-y rounded-xl border">
        {rows.map((r, i) => (
          <li key={r.branchId} className="flex flex-wrap items-center gap-4 px-4 py-2 text-sm">
            <span className="w-32 font-medium">{r.name}</span>
            <Label htmlFor={`price-${r.branchId}`} className="sr-only">
              Price at {r.name}
            </Label>
            <Input
              id={`price-${r.branchId}`}
              inputMode="decimal"
              placeholder={String(basePrice / 100)}
              value={r.price}
              onChange={(e) =>
                setRows((all) => all.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))
              }
              className="w-32"
            />
            <label className="flex items-center gap-2">
              <Switch
                checked={r.isAvailable}
                onCheckedChange={(isAvailable) =>
                  setRows((all) => all.map((x, j) => (j === i ? { ...x, isAvailable } : x)))
                }
              />
              {r.isAvailable ? "Available" : "Sold out"}
            </label>
          </li>
        ))}
      </ul>
      <Button
        disabled={busy || invalid}
        onClick={async () => {
          setBusy(true);
          await run(
            () =>
              saveOverridesAction({
                menuItemId: itemId,
                branches: rows.map((r) => ({
                  branchId: r.branchId,
                  priceCents: toCents(r.price),
                  isAvailable: r.isAvailable,
                })),
              }),
            "Branch prices saved.",
          );
          setBusy(false);
          router.refresh();
        }}
      >
        Save branch prices
      </Button>
    </Panel>
  );
}

function OptionsPanel({ itemId, options }: { itemId: string; options: AdminOption[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState<I18nValue>({ en: "", si: "", ta: "" });
  const [newSelection, setNewSelection] = useState<"single" | "multiple">("single");

  return (
    <Panel
      title="Choices"
      description="Option groups such as portion size or add-ons. Prices are added to the dish price."
    >
      {options.length === 0 && (
        <p className="text-sm text-muted-foreground">No choices for this dish.</p>
      )}
      {options.map((option) => (
        <OptionGroup key={option.id} option={option} onChanged={() => router.refresh()} />
      ))}
      {adding ? (
        <div className="space-y-3 rounded-xl border p-4">
          <I18nFields
            id="new-option"
            label="Group name (e.g. Portion, Add-ons)"
            required
            value={newName}
            onChange={setNewName}
          />
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={newSelection === "single"}
                onChange={() => setNewSelection("single")}
              />{" "}
              Choose one
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={newSelection === "multiple"}
                onChange={() => setNewSelection("multiple")}
              />{" "}
              Choose any
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={!newName.en.trim()}
              onClick={async () => {
                const result = await run(
                  () =>
                    saveOptionAction({
                      id: null,
                      menuItemId: itemId,
                      name: newName,
                      selection: newSelection,
                      isRequired: newSelection === "single",
                      maxSelect: null,
                      sortOrder: options.length,
                    }),
                  "Group added.",
                );
                if (result.ok) {
                  setAdding(false);
                  setNewName({ en: "", si: "", ta: "" });
                  router.refresh();
                }
              }}
            >
              Add group
            </Button>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          Add a choice group
        </Button>
      )}
    </Panel>
  );
}

function OptionGroup({ option, onChanged }: { option: AdminOption; onChanged: () => void }) {
  const [name, setName] = useState<I18nValue>(toI18nValue(option.name_i18n));
  const [selection, setSelection] = useState(option.selection);
  const [required, setRequired] = useState(option.is_required);
  const [values, setValues] = useState(() =>
    option.values.map((v) => ({
      id: v.id as string | null,
      name: toI18nValue(v.name_i18n),
      price: toRupees(v.price_delta_cents),
      isDefault: v.is_default,
      isActive: v.is_active,
    })),
  );

  async function saveGroup() {
    const group = await run(
      () =>
        saveOptionAction({
          id: option.id,
          menuItemId: option.menu_item_id,
          name,
          selection,
          isRequired: required,
          maxSelect: option.max_select,
          sortOrder: option.sort_order,
        }),
      "Group saved.",
    );
    if (!group.ok) return;
    for (const [i, v] of values.entries()) {
      if (!v.name.en.trim()) continue;
      const result = await saveOptionValueAction({
        id: v.id,
        optionId: option.id,
        name: v.name,
        priceDeltaCents: toCents(v.price) ?? 0,
        isDefault: v.isDefault,
        isActive: v.isActive,
        sortOrder: i,
      }).catch(() => ({ ok: false as const, error: "Something went wrong." }));
      if (!result.ok) {
        toast.error(`${v.name.en}: ${result.error}`);
        return;
      }
    }
    onChanged();
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <I18nFields
        id={`option-${option.id}`}
        label="Group name"
        required
        value={name}
        onChange={setName}
      />
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={selection === "single"}
            onChange={() => setSelection("single")}
          />{" "}
          Choose one
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={selection === "multiple"}
            onChange={() => setSelection("multiple")}
          />{" "}
          Choose any
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={required} onCheckedChange={setRequired} /> Required
        </label>
      </div>
      <ul className="space-y-3">
        {values.map((v, i) => (
          <li key={v.id ?? `new-${i}`} className="space-y-2 rounded-lg bg-muted/40 p-3">
            <I18nFields
              id={`value-${option.id}-${i}`}
              label="Choice"
              required
              value={v.name}
              onChange={(n) =>
                setValues((all) => all.map((x, j) => (j === i ? { ...x, name: n } : x)))
              }
            />
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Label htmlFor={`delta-${option.id}-${i}`}>Extra (Rs.)</Label>
                <Input
                  id={`delta-${option.id}-${i}`}
                  inputMode="decimal"
                  value={v.price}
                  onChange={(e) =>
                    setValues((all) =>
                      all.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)),
                    )
                  }
                  className="w-28"
                />
              </div>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={v.isDefault}
                  onCheckedChange={(checked) =>
                    setValues((all) =>
                      all.map((x, j) => (j === i ? { ...x, isDefault: checked === true } : x)),
                    )
                  }
                />
                Default
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={v.isActive}
                  onCheckedChange={(isActive) =>
                    setValues((all) => all.map((x, j) => (j === i ? { ...x, isActive } : x)))
                  }
                />
                Offered
              </label>
              {v.id && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Delete ${v.name.en}`}
                  onClick={async () => {
                    const result = await run(
                      () => deleteOptionValueAction(v.id),
                      "Choice deleted.",
                    );
                    if (result.ok) setValues((all) => all.filter((_, j) => j !== i));
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button onClick={saveGroup}>Save group</Button>
        <Button
          variant="outline"
          onClick={() =>
            setValues((all) => [
              ...all,
              {
                id: null,
                name: { en: "", si: "", ta: "" },
                price: "0",
                isDefault: false,
                isActive: true,
              },
            ])
          }
        >
          Add a choice
        </Button>
        <Button
          variant="ghost"
          className="text-destructive"
          onClick={async () => {
            if (!window.confirm(`Delete the group "${name.en}" and all its choices?`)) return;
            const result = await run(() => deleteOptionAction(option.id), "Group deleted.");
            if (result.ok) onChanged();
          }}
        >
          Delete group
        </Button>
      </div>
    </div>
  );
}
