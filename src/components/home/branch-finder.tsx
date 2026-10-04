"use client";

import { LocateFixed, MapPin, Navigation, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ContactLink } from "@/components/site/contact-link";
import { OpenStatus } from "@/components/site/open-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { byDistance, type LatLng } from "@/lib/geo";
import type { OpeningHours } from "@/lib/hours";
import { formatPhone } from "@/lib/phone";

export type BranchSummary = {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  lat: number;
  lng: number;
  phone: string;
  openingHours: OpeningHours;
};

type LocateState = "idle" | "locating" | "error";

export function BranchFinder({ branches }: { branches: BranchSummary[] }) {
  const t = useTranslations("Home");
  const tb = useTranslations("Branches");
  const tc = useTranslations("Common");
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [state, setState] = useState<LocateState>("idle");

  const list = origin
    ? byDistance(branches, origin)
    : branches.map((b) => ({ ...b, distanceKm: null as number | null }));

  function locate() {
    if (!("geolocation" in navigator)) return setState("error");
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setState("idle");
      },
      () => setState("error"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={locate} disabled={state === "locating"}>
          <LocateFixed data-icon="inline-start" aria-hidden />
          {state === "locating" ? t("locating") : t("useMyLocation")}
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {state === "error" ? t("locationError") : ""}
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-3">
        {list.map((branch, index) => (
          <li
            key={branch.id}
            className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-xl text-primary">{branch.name}</h3>
              {origin && index === 0 && <Badge variant="secondary">{t("nearest")}</Badge>}
            </div>
            <OpenStatus hours={branch.openingHours} />
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                {branch.addressLine}, {branch.city}
                {branch.distanceKm !== null && (
                  <span className="block font-medium text-foreground">
                    {tc("kmAway", { km: branch.distanceKm.toFixed(1) })}
                  </span>
                )}
              </span>
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <Button asChild variant="secondary" size="sm">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation data-icon="inline-start" aria-hidden />
                  {tb("directions")}
                </a>
              </Button>
              <ContactLink
                kind="tel"
                value={branch.phone}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[0.8rem] font-medium"
              >
                <Phone aria-hidden className="size-3.5" />
                {formatPhone(branch.phone)}
              </ContactLink>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
