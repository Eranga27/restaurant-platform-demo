"use client";

import { ArrowUpRight, LocateFixed, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ContactLink } from "@/components/site/contact-link";
import { OpenStatus } from "@/components/site/open-status";
import { Button } from "@/components/ui/button";
import { projectToMap, SRI_LANKA_PATH, SRI_LANKA_VIEWBOX } from "@/data/sri-lanka-map";
import { byDistance, type LatLng } from "@/lib/geo";
import type { OpeningHours } from "@/lib/hours";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

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

/**
 * Sri Lanka with each kitchen pinned where it is, next to the list of
 * branches. Hovering or focusing a branch lights up its pin; "Use my location"
 * adds the visitor and sorts the list by distance.
 */
export function BranchesMap({ branches }: { branches: BranchSummary[] }) {
  const t = useTranslations("Home");
  const tb = useTranslations("Branches");
  const tc = useTranslations("Common");
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [state, setState] = useState<LocateState>("idle");
  const [active, setActive] = useState<string | null>(null);

  const list = origin
    ? byDistance(branches, origin)
    : branches.map((b) => ({ ...b, distanceKm: null as number | null }));
  // Pins close together (Colombo's suburbs) get their labels stacked, not overlapped.
  const pins = branches
    .map((b) => ({ id: b.id, name: b.name, ...projectToMap(b.lat, b.lng), dy: 0 }))
    .sort((a, b) => a.y - b.y);
  pins.forEach((pin, i) => {
    const prev = pins[i - 1];
    if (prev && Math.abs(pin.x - prev.x) < 140 && pin.y + pin.dy - (prev.y + prev.dy) < 22) {
      pin.dy = prev.y + prev.dy + 22 - pin.y;
    }
  });
  const you = origin ? projectToMap(origin.lat, origin.lng) : null;
  const youOnMap =
    you &&
    you.x >= 0 &&
    you.x <= SRI_LANKA_VIEWBOX.width &&
    you.y >= 0 &&
    you.y <= SRI_LANKA_VIEWBOX.height;

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
    <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <figure className="relative mx-auto w-full max-w-sm lg:sticky lg:top-28 lg:max-w-none lg:self-start">
        <svg
          role="img"
          aria-label={t("mapLabel")}
          viewBox={`0 0 ${SRI_LANKA_VIEWBOX.width} ${SRI_LANKA_VIEWBOX.height}`}
          className="h-auto w-full"
        >
          <defs>
            <pattern id="map-dots" width="9" height="9" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.1" fill="currentColor" opacity="0.28" />
            </pattern>
            <clipPath id="map-island">
              <path d={SRI_LANKA_PATH} />
            </clipPath>
          </defs>
          <rect
            width={SRI_LANKA_VIEWBOX.width}
            height={SRI_LANKA_VIEWBOX.height}
            fill="url(#map-dots)"
            clipPath="url(#map-island)"
            className="text-primary"
          />
          <path
            d={SRI_LANKA_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            className="text-primary/60"
          />
          {pins.map((p) => {
            const on = active === p.id;
            const right = p.x > SRI_LANKA_VIEWBOX.width / 2;
            return (
              <g key={p.id} transform={`translate(${p.x} ${p.y})`} className="text-primary">
                <circle
                  r={on ? 22 : 14}
                  fill="currentColor"
                  opacity="0.14"
                  className="transition-all duration-500"
                />
                <circle
                  r={on ? 7 : 5}
                  fill="currentColor"
                  className="transition-all duration-500"
                />
                {p.dy !== 0 && (
                  <line
                    x1="0"
                    y1="0"
                    x2={right ? -10 : 10}
                    y2={p.dy}
                    stroke="currentColor"
                    opacity="0.4"
                  />
                )}
                <text
                  x={right ? -14 : 14}
                  y={4 + p.dy}
                  textAnchor={right ? "end" : "start"}
                  className={cn(
                    "font-mono text-[13px] tracking-wider uppercase transition-opacity",
                    on ? "opacity-100" : "opacity-70",
                  )}
                  fill="currentColor"
                >
                  {p.name}
                </text>
              </g>
            );
          })}
          {youOnMap && you && (
            <g transform={`translate(${you.x} ${you.y})`} className="text-secondary">
              <circle r="16" fill="currentColor" opacity="0.18" />
              <circle r="5" fill="currentColor" stroke="var(--background)" strokeWidth="2" />
            </g>
          )}
        </svg>
      </figure>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={locate} disabled={state === "locating"}>
            <LocateFixed data-icon="inline-start" aria-hidden />
            {state === "locating" ? t("locating") : t("useMyLocation")}
          </Button>
          <p role="status" className="text-sm text-muted-foreground">
            {state === "error" ? t("locationError") : ""}
          </p>
        </div>
        <ol className="mt-8 border-b border-current/15">
          {list.map((branch, index) => (
            <li
              key={branch.id}
              onPointerEnter={() => setActive(branch.id)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(branch.id)}
              onBlur={() => setActive(null)}
              className="grid gap-4 border-t border-current/15 py-7 sm:grid-cols-[auto_1fr_auto] sm:items-start"
            >
              <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="space-y-2">
                <h3 className="flex flex-wrap items-baseline gap-x-3 font-display text-display-md">
                  {branch.name}
                  {origin && index === 0 && (
                    <span className="font-mono text-[0.65rem] tracking-[0.2em] text-secondary uppercase">
                      {t("nearest")}
                    </span>
                  )}
                </h3>
                <OpenStatus hours={branch.openingHours} />
                <p className="text-sm text-muted-foreground">
                  {branch.addressLine}, {branch.city}
                  {branch.distanceKm !== null && (
                    <span className="ml-2 font-mono text-xs text-foreground">
                      {tc("kmAway", { km: branch.distanceKm.toFixed(1) })}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                >
                  {tb("directions")}
                  <ArrowUpRight aria-hidden className="size-4" />
                </a>
                <ContactLink
                  kind="tel"
                  value={branch.phone}
                  className="inline-flex items-center gap-1.5 font-mono text-xs tracking-wide text-muted-foreground hover:text-foreground"
                >
                  <Phone aria-hidden className="size-3.5" />
                  {formatPhone(branch.phone)}
                </ContactLink>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
