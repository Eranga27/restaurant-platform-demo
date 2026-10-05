"use client";

import { Loader2, Plus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { saveBranchAction, uploadBranchImageAction } from "@/app/(staff)/admin/branches/actions";
import { DeliveryMap } from "@/components/checkout/delivery-map-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AdminBranch } from "@/lib/admin/branches";

import { Panel } from "./admin-shell";
import { I18nFields, slugify, toI18nValue, type I18nValue } from "./i18n-fields";

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;
type Day = (typeof DAYS)[number][0];
type Hours = Record<Day, [string, string][]>;

const rupees = (cents: number | null) => (cents === null ? "" : String(cents / 100));
const toCents = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function BranchEditor({
  branch,
  telegramChatId,
  imageUrl,
  districts,
  defaultFees,
}: {
  branch: AdminBranch | null;
  telegramChatId: string | null;
  imageUrl: string | null;
  districts: string[];
  defaultFees: {
    baseFeeCents: number;
    includedKm: number;
    perKmCents: number;
    freeAboveCents: number | null;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState<I18nValue>(toI18nValue(branch?.name_i18n));
  const [slug, setSlug] = useState(branch?.slug ?? "");
  const [address, setAddress] = useState(branch?.address_line ?? "");
  const [city, setCity] = useState(branch?.city ?? "");
  const [district, setDistrict] = useState(branch?.district ?? districts[0] ?? "");
  const [location, setLocation] = useState({
    lat: branch?.lat ?? 6.9112,
    lng: branch?.lng ?? 79.8556,
  });
  const [phone, setPhone] = useState(branch?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(branch?.whatsapp ?? "");
  const [email, setEmail] = useState(branch?.email ?? "");
  const [radius, setRadius] = useState(String(branch?.delivery_radius_km ?? 5));
  const fees = branch?.delivery_fee_rules ?? defaultFees;
  const [baseFee, setBaseFee] = useState(rupees(fees.baseFeeCents));
  const [includedKm, setIncludedKm] = useState(String(fees.includedKm));
  const [perKm, setPerKm] = useState(rupees(fees.perKmCents));
  const [freeAbove, setFreeAbove] = useState(rupees(fees.freeAboveCents));
  const [hours, setHours] = useState<Hours>(
    () =>
      Object.fromEntries(
        DAYS.map(([d]) => [d, branch?.opening_hours[d] ?? [["11:00", "22:30"]]]),
      ) as Hours,
  );
  const [capacity, setCapacity] = useState(String(branch?.seating_capacity ?? 40));
  const [accepting, setAccepting] = useState(branch?.is_accepting_orders ?? true);
  const [active, setActive] = useState(branch?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(String(branch?.sort_order ?? 0));
  const [telegram, setTelegram] = useState(telegramChatId ?? "");

  const setRange = (day: Day, i: number, part: 0 | 1, value: string) =>
    setHours((h) => ({
      ...h,
      [day]: h[day].map((r, j) => (j === i ? (part === 0 ? [value, r[1]] : [r[0], value]) : r)),
    }));

  async function save() {
    setBusy(true);
    const result = await saveBranchAction({
      id: branch?.id ?? null,
      slug: slug || slugify(name.en),
      name,
      addressLine: address,
      city,
      district,
      lat: location.lat,
      lng: location.lng,
      phone,
      whatsapp,
      email,
      deliveryRadiusKm: Number(radius),
      fees: {
        baseFeeCents: toCents(baseFee) ?? 0,
        includedKm: Number(includedKm) || 0,
        perKmCents: toCents(perKm) ?? 0,
        freeAboveCents: toCents(freeAbove),
      },
      hours,
      seatingCapacity: Number(capacity) || 0,
      isAcceptingOrders: accepting,
      isActive: active,
      sortOrder: Number(sortOrder) || 0,
      telegramChatId: telegram,
    }).catch(() => ({ ok: false as const, error: "Something went wrong." }));
    setBusy(false);
    if (!result.ok) return toast.error(result.error);
    toast.success(branch ? "Branch saved." : "Branch added.");
    if (!branch && result.id) router.replace(`/admin/branches/${result.id}`);
    else router.refresh();
  }

  async function upload(file: File | undefined) {
    if (!file || !branch) return;
    const form = new FormData();
    form.set("branchId", branch.id);
    form.set("image", file);
    setBusy(true);
    const result = await uploadBranchImageAction(form).catch(() => ({
      ok: false as const,
      error: "Upload failed.",
    }));
    setBusy(false);
    if (result.ok) toast.success("Photo updated.");
    else toast.error(result.error);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Panel title="Branch">
        <I18nFields id="branch-name" label="Name" required value={name} onChange={setName} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="slug" label="Link name">
            <Input
              id="slug"
              value={slug}
              placeholder={slugify(name.en)}
              onChange={(e) => setSlug(e.target.value)}
            />
          </Field>
          <Field id="phone" label="Phone">
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field id="whatsapp" label="WhatsApp (optional)">
            <Input
              id="whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </Field>
          <Field id="email" label="Email (optional)">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field id="capacity" label="Seats">
            <Input
              id="capacity"
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </Field>
          <Field id="order" label="Order in lists">
            <Input
              id="order"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={accepting} onCheckedChange={setAccepting} /> Taking online orders
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} /> Shown on the site
          </label>
        </div>
      </Panel>

      <Panel
        title="Address and map"
        description="Click the map to move the pin to the branch's entrance."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="address" label="Address">
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field id="city" label="City">
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field id="district" label="District">
            <select
              id="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="h-72 overflow-hidden rounded-xl border">
          <DeliveryMap
            value={location}
            onChange={setLocation}
            label="Branch location"
            areas={[
              {
                id: "branch",
                name: name.en,
                lat: location.lat,
                lng: location.lng,
                radiusKm: Number(radius) || 0,
              },
            ]}
          />
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </p>
      </Panel>

      <Panel
        title="Delivery"
        description="Distance is measured in a straight line from the branch."
      >
        <div className="grid gap-4 sm:grid-cols-5">
          <Field id="radius" label="Delivers up to (km)">
            <Input
              id="radius"
              inputMode="decimal"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
          </Field>
          <Field id="base-fee" label="Delivery fee (Rs.)">
            <Input
              id="base-fee"
              inputMode="decimal"
              value={baseFee}
              onChange={(e) => setBaseFee(e.target.value)}
            />
          </Field>
          <Field id="included" label="Covers the first (km)">
            <Input
              id="included"
              inputMode="decimal"
              value={includedKm}
              onChange={(e) => setIncludedKm(e.target.value)}
            />
          </Field>
          <Field id="per-km" label="Then per km (Rs.)">
            <Input
              id="per-km"
              inputMode="decimal"
              value={perKm}
              onChange={(e) => setPerKm(e.target.value)}
            />
          </Field>
          <Field id="free-above" label="Free above (Rs., optional)">
            <Input
              id="free-above"
              inputMode="decimal"
              value={freeAbove}
              onChange={(e) => setFreeAbove(e.target.value)}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Opening hours" description="Sri Lanka time. A day with no hours is closed.">
        <ul className="space-y-2">
          {DAYS.map(([day, label]) => (
            <li key={day} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-24 font-medium">{label}</span>
              {hours[day].length === 0 && <span className="text-muted-foreground">Closed</span>}
              {hours[day].map(([open, close], i) => (
                <span key={i} className="flex items-center gap-1">
                  <Input
                    type="time"
                    aria-label={`${label} opens`}
                    value={open}
                    onChange={(e) => setRange(day, i, 0, e.target.value)}
                    className="w-28"
                  />
                  –
                  <Input
                    type="time"
                    aria-label={`${label} closes`}
                    value={close}
                    onChange={(e) => setRange(day, i, 1, e.target.value)}
                    className="w-28"
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${label} hours`}
                    onClick={() =>
                      setHours((h) => ({ ...h, [day]: h[day].filter((_, j) => j !== i) }))
                    }
                  >
                    <X aria-hidden />
                  </Button>
                </span>
              ))}
              {hours[day].length < 3 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setHours((h) => ({ ...h, [day]: [...h[day], ["11:00", "22:30"]] }))
                  }
                >
                  <Plus data-icon="inline-start" aria-hidden />
                  Add hours
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Alerts"
        description="Optional: the Telegram group that gets new-order alerts. Add the bot to the group, then paste the group's chat ID."
      >
        <Field id="telegram" label="Telegram chat ID">
          <Input
            id="telegram"
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="-1001234567890"
            className="max-w-xs"
          />
        </Field>
      </Panel>

      {branch && (
        <Panel title="Photo">
          <div className="flex flex-wrap items-center gap-4">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name.en}
                width={240}
                height={160}
                className="h-40 w-60 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-40 w-60 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
                No photo
              </div>
            )}
            <Input
              type="file"
              aria-label="Choose a photo"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={busy}
              onChange={(e) => upload(e.target.files?.[0])}
              className="max-w-xs"
            />
          </div>
        </Panel>
      )}

      <Button size="lg" onClick={save} disabled={busy || !name.en.trim()}>
        {busy && <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />}
        {branch ? "Save branch" : "Add branch"}
      </Button>
    </div>
  );
}
