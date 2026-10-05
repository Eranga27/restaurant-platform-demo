"use client";

import { MapPin, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { addAddressAction, deleteAddressAction } from "@/app/[locale]/(site)/account/actions";
import { DeliveryMap } from "@/components/checkout/delivery-map-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SavedAddress } from "@/lib/account/addresses";
import type { DistrictOption } from "@/lib/data/places";
import type { LatLng } from "@/lib/geo";

/** Saved delivery addresses: list, delete, and add one with a map pin. */
export function AddressBook({
  addresses,
  districts,
}: {
  addresses: SavedAddress[];
  districts: DistrictOption[];
}) {
  const t = useTranslations("Account");
  const tc = useTranslations("Checkout");
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [line, setLine] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pin, setPin] = useState<LatLng | null>(null);
  const cities = districts.find((d) => d.name === district)?.cities ?? [];

  async function add() {
    if (!pin) return;
    setBusy(true);
    const result = await addAddressAction({
      label,
      district,
      city,
      line,
      landmark: landmark.trim() || null,
      lat: pin.lat,
      lng: pin.lng,
    }).catch(() => ({ ok: false as const, error: "unknown" as const }));
    setBusy(false);
    if (!result.ok) return toast.error(t(`errors.${result.error}`));
    toast.success(t("addressSaved"));
    setAdding(false);
    setLabel("");
    setLine("");
    setLandmark("");
    setPin(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !adding && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          {t("noAddresses")}
        </p>
      )}
      <ul className="space-y-2">
        {addresses.map((a) => (
          <li
            key={a.id}
            className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-soft"
          >
            <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <span className="flex-1 text-sm">
              <span className="block font-semibold">{a.label}</span>
              {[a.line, a.landmark, a.city, a.district].filter(Boolean).join(", ")}
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t("deleteAddress", { label: a.label })}
              onClick={async () => {
                const result = await deleteAddressAction(a.id).catch(() => ({
                  ok: false as const,
                }));
                if (result.ok) router.refresh();
                else toast.error(t("errors.unknown"));
              }}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
          <div className="space-y-2">
            <Label htmlFor="address-label">{t("addressName")}</Label>
            <Input
              id="address-label"
              value={label}
              maxLength={40}
              placeholder={tc("homeLabel")}
              onChange={(e) => setLabel(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <p className="text-sm text-muted-foreground">{tc("mapHelp")}</p>
          <div className="h-64 overflow-hidden rounded-xl border">
            <DeliveryMap value={pin} onChange={setPin} label={tc("mapLabel")} areas={[]} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address-district">{tc("district")}</Label>
              <select
                id="address-district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="" />
                {districts.map((d) => (
                  <option key={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-city">{tc("city")}</Label>
              <Input
                id="address-city"
                list="address-cities"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <datalist id="address-cities">
                {cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address-line">{tc("address")}</Label>
              <Input id="address-line" value={line} onChange={(e) => setLine(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address-landmark">{tc("landmark")}</Label>
              <Input
                id="address-landmark"
                value={landmark}
                placeholder={tc("landmarkPlaceholder")}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={add}
              disabled={
                busy || !label.trim() || !district || !city.trim() || line.trim().length < 3 || !pin
              }
            >
              {t("saveAddress")}
            </Button>
            <Button variant="outline" onClick={() => setAdding(false)}>
              {t("cancel")}
            </Button>
          </div>
          {!pin && <p className="text-sm text-muted-foreground">{tc("pinNeeded")}</p>}
        </div>
      ) : (
        addresses.length < 10 && (
          <Button variant="outline" onClick={() => setAdding(true)}>
            {t("addAddress")}
          </Button>
        )
      )}
    </div>
  );
}
