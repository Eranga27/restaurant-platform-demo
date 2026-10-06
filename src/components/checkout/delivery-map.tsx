"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import type { LatLng } from "@/lib/geo";

export type MapArea = { id: string; name: string; lat: number; lng: number; radiusKm: number };

type DeliveryMapProps = {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  areas: MapArea[];
  label: string;
};

/** Pin picker for the delivery address. Loaded in the browser only (delivery-map-loader). */
export default function DeliveryMap({ value, onChange, areas, label }: DeliveryMapProps) {
  const pin = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<span class="block size-6 rounded-full border-[3px] border-white bg-highlight shadow-lifted"></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    [],
  );
  const start =
    value ?? (areas[0] ? { lat: areas[0].lat, lng: areas[0].lng } : { lat: 6.9112, lng: 79.8556 });

  return (
    <div role="region" aria-label={label} className="h-full w-full">
      <MapContainer
        center={[start.lat, start.lng]}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        {areas.map((a) => (
          <Circle
            key={a.id}
            center={[a.lat, a.lng]}
            radius={a.radiusKm * 1000}
            pathOptions={{ color: "#1f4a36", weight: 1, fillOpacity: 0.06 }}
          />
        ))}
        <PickOnClick onPick={onChange} />
        <FollowValue value={value} />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={pin}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = (e.target as L.Marker).getLatLng();
                onChange({ lat, lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

function PickOnClick({ onPick }: { onPick: (value: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** Moves the map when the pin is set from outside (e.g. "use my location"). */
function FollowValue({ value }: { value: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (value && !map.getBounds().contains([value.lat, value.lng])) {
      map.flyTo([value.lat, value.lng], Math.max(map.getZoom(), 15));
    }
  }, [map, value]);
  return null;
}
