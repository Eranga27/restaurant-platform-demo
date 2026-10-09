"use client";

import { Minus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { DietaryBadge } from "@/components/site/dietary-badge";
import { DishImage } from "@/components/site/dish-image";
import { SPICE_LEVELS, SpiceLevelIndicator, type SpiceLevel } from "@/components/site/spice-level";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart/store";
import { flyToCart } from "@/lib/fly-to-cart";
import type { MenuItemView, MenuOptionView } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";
import {
  defaultSelection,
  unitPriceCents,
  validateSelection,
  type Selection,
} from "@/lib/pricing/item";

import type { ItemAvailability } from "./menu-item-card";

const MAX_QUANTITY = 20;
const MAX_INSTRUCTIONS = 200;

type ItemSheetProps = {
  item: MenuItemView | null;
  branchId: string;
  branchName: string;
  branchPriceCents: number | null;
  availability: ItemAvailability;
  holidayName: string | null;
  onClose: () => void;
};

export function ItemSheet(props: ItemSheetProps) {
  const t = useTranslations("Common");
  return (
    <Dialog open={props.item !== null} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none sm:max-w-lg max-sm:data-open:slide-in-from-bottom-10"
      >
        {/* Keyed by item so each dish starts from its own defaults. */}
        {props.item && (
          <ItemSheetBody key={props.item.id} {...props} item={props.item} closeLabel={t("close")} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ItemSheetBody({
  item,
  branchId,
  branchName,
  branchPriceCents,
  availability,
  holidayName,
  onClose,
  closeLabel,
}: ItemSheetProps & { item: MenuItemView; closeLabel: string }) {
  const t = useTranslations("Item");
  const dietary = useTranslations("Dietary");
  const spice = useTranslations("Spice");
  const instructionsId = useId();
  const photo = useRef<HTMLDivElement>(null);

  const [selection, setSelection] = useState<Selection>(() => defaultSelection(item));
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>("medium");
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);

  const valid = validateSelection(item, selection).length === 0;
  const unitPrice = unitPriceCents(item, selection, branchPriceCents);
  const canOrder = availability === "available" && valid;

  function toggle(option: MenuOptionView, valueId: string, checked: boolean) {
    setSelection((current) => {
      const chosen = current[option.id] ?? [];
      if (option.selection === "single") return { ...current, [option.id]: [valueId] };
      const next = checked ? [...chosen, valueId] : chosen.filter((id) => id !== valueId);
      return { ...current, [option.id]: next };
    });
  }

  function addToOrder() {
    const cart = useCart.getState();
    if (cart.branchId !== branchId) cart.setBranch(branchId);
    // Readable summary of the non-default choices, for the cart and receipts.
    const defaults = defaultSelection(item);
    const details = item.options.flatMap((option) =>
      option.values
        .filter((v) => (selection[option.id] ?? []).includes(v.id))
        .filter(
          (v) => option.selection === "multiple" || !(defaults[option.id] ?? []).includes(v.id),
        )
        .map((v) => v.name),
    );
    if (item.spiceSelectable) details.push(spice(spiceLevel));
    const note = instructions.trim();
    if (note) details.push(`“${note}”`);

    cart.add({
      menuItemId: item.id,
      selection,
      spiceLevel: item.spiceSelectable ? spiceLevel : null,
      instructions: note || null,
      quantity,
      slug: item.slug,
      name: item.name,
      imageUrl: item.imageUrl,
      details,
      unitPriceCents: unitPrice,
    });
    // Before the dialog closes, while the photo is still on screen.
    flyToCart(photo.current);
    onClose();
    toast.success(t("added", { name: item.name }), {
      action: { label: t("viewOrder"), onClick: () => useCart.getState().setOpen(true) },
    });
  }

  return (
    <>
      <div ref={photo} className="relative aspect-[16/10] shrink-0 bg-muted">
        <DishImage src={item.imageUrl} alt={item.name} sizes="(min-width: 640px) 512px, 100vw" />
        <DialogClose asChild>
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-3 right-3 rounded-full bg-background/90 text-foreground shadow-soft hover:bg-background"
          >
            <X aria-hidden />
            <span className="sr-only">{closeLabel}</span>
          </Button>
        </DialogClose>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
        <div className="space-y-2">
          <DialogTitle className="font-display text-2xl text-primary">{item.name}</DialogTitle>
          {item.description ? (
            <DialogDescription className="text-base text-muted-foreground">
              {item.description}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{item.name}</DialogDescription>
          )}
          {item.dietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {item.dietaryTags.map((tag) => (
                <DietaryBadge key={tag} tag={tag} label={dietary(tag)} />
              ))}
            </div>
          )}
        </div>

        {availability === "sold-out" && (
          <p role="status" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {t("soldOutAt", { branch: branchName })}
          </p>
        )}
        {availability === "not-today" && holidayName && (
          <p role="status" className="rounded-xl bg-muted p-3 text-sm">
            {t("notServedToday", { holiday: holidayName })}
          </p>
        )}

        {item.options.map((option) => (
          <fieldset key={option.id} className="space-y-3">
            <legend className="flex w-full items-center justify-between gap-2 pb-1">
              <span className="font-semibold">{option.name}</span>
              <Badge variant={option.isRequired ? "secondary" : "outline"}>
                {option.isRequired
                  ? t("required")
                  : option.selection === "multiple" && option.maxSelect
                    ? t("chooseUpTo", { count: option.maxSelect })
                    : t("optional")}
              </Badge>
            </legend>
            {option.selection === "single" ? (
              <RadioGroup
                value={selection[option.id]?.[0] ?? ""}
                onValueChange={(value) => toggle(option, value, true)}
                className="gap-0 divide-y rounded-xl border"
              >
                {option.values.map((value) => (
                  <OptionRow
                    key={value.id}
                    id={`${option.id}-${value.id}`}
                    label={value.name}
                    delta={value.priceDeltaCents}
                    showFree={false}
                  >
                    <RadioGroupItem value={value.id} id={`${option.id}-${value.id}`} />
                  </OptionRow>
                ))}
              </RadioGroup>
            ) : (
              <div className="divide-y rounded-xl border">
                {option.values.map((value) => {
                  const chosen = selection[option.id] ?? [];
                  const checked = chosen.includes(value.id);
                  const atLimit =
                    option.maxSelect !== null && chosen.length >= option.maxSelect && !checked;
                  return (
                    <OptionRow
                      key={value.id}
                      id={`${option.id}-${value.id}`}
                      label={value.name}
                      delta={value.priceDeltaCents}
                    >
                      <Checkbox
                        id={`${option.id}-${value.id}`}
                        checked={checked}
                        disabled={atLimit}
                        onCheckedChange={(state) => toggle(option, value.id, state === true)}
                      />
                    </OptionRow>
                  );
                })}
              </div>
            )}
          </fieldset>
        ))}

        {item.spiceSelectable && (
          <fieldset className="space-y-3">
            <legend className="pb-1 font-semibold">{spice("label")}</legend>
            <RadioGroup
              value={spiceLevel}
              onValueChange={(v) => setSpiceLevel(v as SpiceLevel)}
              className="grid grid-cols-3 gap-2"
            >
              {SPICE_LEVELS.map((level) => (
                <Label
                  key={level}
                  htmlFor={`spice-${level}`}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-center has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                >
                  <RadioGroupItem value={level} id={`spice-${level}`} className="sr-only" />
                  <SpiceLevelIndicator level={level} label={spice(level)} className="flex-col" />
                </Label>
              ))}
            </RadioGroup>
          </fieldset>
        )}

        <div className="space-y-2">
          <Label htmlFor={instructionsId} className="font-semibold">
            {t("instructions")}
          </Label>
          <Textarea
            id={instructionsId}
            value={instructions}
            maxLength={MAX_INSTRUCTIONS}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t("instructionsPlaceholder")}
            aria-describedby={`${instructionsId}-help`}
            rows={2}
          />
          <p id={`${instructionsId}-help`} className="text-xs text-muted-foreground">
            {t("instructionsHelp")}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t bg-background p-4 sm:px-6">
        <div
          className="flex items-center rounded-lg border"
          role="group"
          aria-label={t("quantity")}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label={t("decrease")}
          >
            <Minus aria-hidden />
          </Button>
          <output aria-live="polite" className="w-8 text-center font-semibold tabular-nums">
            {quantity}
          </output>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
            disabled={quantity >= MAX_QUANTITY}
            aria-label={t("increase")}
          >
            <Plus aria-hidden />
          </Button>
        </div>
        <Button size="lg" className="flex-1" disabled={!canOrder} onClick={addToOrder}>
          {t("addToOrder", { price: formatLKR(unitPrice * quantity) })}
        </Button>
      </div>
    </>
  );
}

/** One choice. A zero delta reads "Free" for add-ons and shows nothing for single choices like portion. */
function OptionRow({
  id,
  label,
  delta,
  showFree = true,
  children,
}: {
  id: string;
  label: string;
  delta: number;
  showFree?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("Item");
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {children}
      <Label
        htmlFor={id}
        className="flex flex-1 cursor-pointer items-center justify-between gap-3 font-normal"
      >
        <span>{label}</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {delta === 0
            ? showFree
              ? t("free")
              : null
            : `${delta > 0 ? "+" : ""}${formatLKR(delta, { whole: true })}`}
        </span>
      </Label>
    </div>
  );
}
