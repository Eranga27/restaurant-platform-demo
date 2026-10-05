"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { saveSettingsAction } from "@/app/(staff)/admin/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Brand } from "@/config/brand";
import { contrast, TEXT_PAIRS } from "@/lib/color";

import { Panel } from "./admin-shell";

type Path = (string | number)[];

/** Returns a copy of `obj` with the value at `path` replaced. */
function setIn<T>(obj: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [key, ...rest] = path;
  const copy = (Array.isArray(obj) ? [...obj] : { ...(obj as object) }) as Record<
    string | number,
    unknown
  >;
  copy[key!] = setIn(copy[key!], rest, value);
  return copy as T;
}

const COLORS: [keyof Brand["colors"], string][] = [
  ["primary", "Main colour"],
  ["primaryForeground", "Text on main colour"],
  ["secondary", "Second colour"],
  ["secondaryForeground", "Text on second colour"],
  ["accent", "Accent"],
  ["accentForeground", "Text on accent"],
  ["background", "Page background"],
  ["foreground", "Body text"],
];

const FEATURES: [keyof Brand["features"], string][] = [
  ["delivery", "Delivery"],
  ["pickup", "Pickup"],
  ["cashOnDelivery", "Cash on delivery and at the counter"],
  ["reservations", "Table bookings"],
  ["events", "Events and catering enquiries"],
  ["alcohol", "Alcohol on the menu (hidden on Poya days)"],
  ["loyalty", "Loyalty points"],
];

export function SettingsForm({ brand: initial }: { brand: Brand }) {
  const router = useRouter();
  const [brand, setBrand] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (path: Path, value: unknown) => setBrand((b) => setIn(b, path, value));

  const text = (path: Path, label: string, props: React.ComponentProps<typeof Input> = {}) => {
    const id = `s-${path.join("-")}`;
    const value = path.reduce<unknown>(
      (o, k) => (o as Record<string | number, unknown>)?.[k],
      brand,
    );
    return (
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => set(path, e.target.value)}
          {...props}
        />
      </div>
    );
  };

  /** A number input; `scale` converts stored units to shown ones (cents → rupees: 100, bps → %: 100). */
  const number = (path: Path, label: string, scale = 1, nullable = false) => {
    const id = `s-${path.join("-")}`;
    const value = path.reduce<unknown>(
      (o, k) => (o as Record<string | number, unknown>)?.[k],
      brand,
    ) as number | null;
    return (
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          inputMode="decimal"
          defaultValue={value === null ? "" : String(value / scale)}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (raw === "" && nullable) return set(path, null);
            const n = Number(raw);
            if (Number.isFinite(n)) set(path, Math.round(n * scale));
          }}
        />
      </div>
    );
  };

  async function save() {
    setBusy(true);
    const result = await saveSettingsAction(brand).catch(() => ({
      ok: false as const,
      error: "Something went wrong.",
    }));
    setBusy(false);
    if (!result.ok) return toast.error(result.error);
    toast.success("Settings saved. The site shows them within a few minutes.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Panel title="Restaurant">
        <div className="grid gap-4 sm:grid-cols-2">
          {text(["name"], "Name")}
          {text(["shortName"], "Short name (app icon, 12 letters max)", { maxLength: 12 })}
          {text(["tagline"], "Tagline")}
          {text(["hoursSummary"], "Opening hours line in the footer")}
        </div>
        <div className="space-y-1">
          <Label htmlFor="s-description">Description (search results and sharing)</Label>
          <Textarea
            id="s-description"
            rows={3}
            value={brand.description}
            onChange={(e) => set(["description"], e.target.value)}
          />
        </div>
      </Panel>

      <Panel title="Contact and social">
        <div className="grid gap-4 sm:grid-cols-2">
          {text(["contact", "phone"], "Phone (+94…)")}
          {text(["contact", "email"], "Email", { type: "email" })}
          {text(["contact", "address"], "Head office address")}
          <div className="space-y-1">
            <Label htmlFor="s-whatsapp">WhatsApp (+94…, optional)</Label>
            <Input
              id="s-whatsapp"
              value={brand.contact.whatsapp ?? ""}
              onChange={(e) => set(["contact", "whatsapp"], e.target.value.trim() || null)}
            />
          </div>
          {(["facebook", "instagram", "tiktok", "youtube"] as const).map((network) => (
            <div key={network} className="space-y-1">
              <Label htmlFor={`s-${network}`} className="capitalize">
                {network} link (optional)
              </Label>
              <Input
                id={`s-${network}`}
                type="url"
                value={brand.social[network] ?? ""}
                onChange={(e) => set(["social", network], e.target.value.trim() || null)}
              />
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Colours"
        description="Text colours must stay readable on their backgrounds (WCAG AA, 4.5:1)."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLORS.map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`s-color-${key}`}>{label}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${label} picker`}
                  value={brand.colors[key]}
                  onChange={(e) => set(["colors", key], e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-md border"
                />
                <Input
                  id={`s-color-${key}`}
                  value={brand.colors[key]}
                  onChange={(e) => set(["colors", key], e.target.value)}
                  className="font-mono"
                  maxLength={7}
                />
              </div>
            </div>
          ))}
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {TEXT_PAIRS.map(([fg, bg, label]) => {
            const valid = /^#[0-9a-fA-F]{6}$/;
            const ratio =
              valid.test(brand.colors[fg]) && valid.test(brand.colors[bg])
                ? contrast(brand.colors[fg], brand.colors[bg])
                : 0;
            return (
              <li
                key={label}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
                style={{ background: brand.colors[bg], color: brand.colors[fg] }}
              >
                <span>{label}</span>
                <span className="rounded bg-white px-1.5 font-mono text-xs text-black">
                  {ratio.toFixed(1)}:1 {ratio >= 4.5 ? "✓" : "too low"}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Features">
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Switch
                checked={brand.features[key]}
                onCheckedChange={(v) => set(["features", key], v)}
              />
              {label}
            </label>
          ))}
        </div>
      </Panel>

      <Panel
        title="Charges and orders"
        description="VAT is added on top of the food total and service charge. Check the current VAT rate before going live."
      >
        <div className="grid gap-4 sm:grid-cols-4">
          {number(["charges", "serviceChargeBps"], "Service charge (%)", 100)}
          {number(["charges", "vatBps"], "VAT (%)", 100)}
          {number(["charges", "minimumOrderCents"], "Minimum delivery order (Rs.)", 100)}
          {number(["orders", "autoRejectMinutes"], "Auto-reject after (minutes, 0 = off)")}
        </div>
        <p className="text-sm text-muted-foreground">Default delivery fees for new branches:</p>
        <div className="grid gap-4 sm:grid-cols-4">
          {number(["charges", "delivery", "baseFeeCents"], "Delivery fee (Rs.)", 100)}
          {number(["charges", "delivery", "includedKm"], "Covers the first (km)")}
          {number(["charges", "delivery", "perKmCents"], "Then per km (Rs.)", 100)}
          {number(
            ["charges", "delivery", "freeAboveCents"],
            "Free above (Rs., optional)",
            100,
            true,
          )}
        </div>
      </Panel>

      <Panel title="Table bookings">
        <div className="grid gap-4 sm:grid-cols-4">
          {number(["reservations", "onlineShareBps"], "Seats bookable online (%)", 100)}
          {number(["reservations", "maxPartySize"], "Largest party online")}
          {number(["reservations", "seatingMinutes"], "Table held (minutes)")}
          {number(["reservations", "largePartySize"], "Large party from (guests)")}
          {number(["reservations", "largePartyMinutes"], "Large party held (minutes)")}
          {number(["reservations", "slotMinutes"], "Time slots every (minutes)")}
          {number(["reservations", "minNoticeMinutes"], "Book at least (minutes ahead)")}
          {number(["reservations", "maxDaysAhead"], "Book up to (days ahead)")}
          {number(["reservations", "lastSeatingMinutes"], "Last seating before close (minutes)")}
          {number(["reservations", "cancelUntilMinutes"], "Guests cancel until (minutes before)")}
        </div>
      </Panel>

      <Panel title="Events and catering">
        <div className="grid gap-4 sm:grid-cols-4">
          {number(["events", "minGuests"], "Fewest guests")}
          {number(["events", "maxGuests"], "Most guests")}
          {number(["events", "minNoticeDays"], "Notice needed (days)")}
          {number(["events", "defaultDepositBps"], "Suggested deposit (%)", 100)}
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium">Menus to start from</p>
          {brand.events.packages.map((pkg, i) => (
            <div
              key={pkg.id}
              className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_2fr_10rem_auto]"
            >
              {text(["events", "packages", i, "name", "en"], "Name")}
              {text(["events", "packages", i, "description", "en"], "Description")}
              {number(["events", "packages", i, "fromPerGuestCents"], "From (Rs. per guest)", 100)}
              <Button
                size="icon-sm"
                variant="ghost"
                className="self-end"
                aria-label={`Remove ${pkg.name.en}`}
                disabled={brand.events.packages.length <= 1}
                onClick={() =>
                  set(
                    ["events", "packages"],
                    brand.events.packages.filter((_, j) => j !== i),
                  )
                }
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set(
                ["events", "packages"],
                [
                  ...brand.events.packages,
                  {
                    id: `menu-${brand.events.packages.length + 1}-${Date.now().toString(36)}`,
                    name: { en: "New menu" },
                    description: { en: "" },
                    fromPerGuestCents: 0,
                  },
                ],
              )
            }
          >
            <Plus data-icon="inline-start" aria-hidden />
            Add a menu
          </Button>
        </div>
      </Panel>

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button size="lg" onClick={save} disabled={busy}>
          {busy && <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />}
          Save settings
        </Button>
      </div>
    </div>
  );
}
