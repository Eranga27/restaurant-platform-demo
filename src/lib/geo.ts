export type LatLng = { lat: number; lng: number };

/** Great-circle distance in kilometres (docs/DECISIONS.md B3: delivery radius is straight-line). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Sorts places by distance from `origin`, nearest first. */
export function byDistance<T extends LatLng>(
  places: T[],
  origin: LatLng,
): (T & { distanceKm: number })[] {
  return places
    .map((place) => ({ ...place, distanceKm: distanceKm(origin, place) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
