"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

export type MapBranch = { id: string; name: string; address: string; lat: number; lng: number };

/**
 * OpenStreetMap tiles via Leaflet (no Google Maps billing). Loaded only in the
 * browser; see branch-map-loader.tsx.
 */
export default function BranchMap({ branches, label }: { branches: MapBranch[]; label: string }) {
  const bounds = useMemo(
    () => L.latLngBounds(branches.map((b) => [b.lat, b.lng] as [number, number])).pad(0.25),
    [branches],
  );
  // A brand-coloured pin drawn in CSS: no marker image assets to resolve.
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<span class="block size-5 rounded-full border-[3px] border-white bg-primary shadow-lifted"></span>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -12],
      }),
    [],
  );

  return (
    <div role="region" aria-label={label} className="h-full w-full">
      <MapContainer
        bounds={bounds}
        scrollWheelZoom={false}
        className="h-full w-full"
        attributionControl
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        {branches.map((b) => (
          <Marker key={b.id} position={[b.lat, b.lng]} icon={icon} title={b.name} alt={b.name}>
            <Popup>
              <strong>{b.name}</strong>
              <br />
              {b.address}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
