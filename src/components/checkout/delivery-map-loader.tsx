"use client";

import dynamic from "next/dynamic";

export type { MapArea } from "./delivery-map";

/** Leaflet needs `window`; load it in the browser, outside the main bundle. */
export const DeliveryMap = dynamic(() => import("./delivery-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});
