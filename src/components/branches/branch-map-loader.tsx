"use client";

import dynamic from "next/dynamic";

import type { MapBranch } from "./branch-map";

// Leaflet touches `window`, so it can't render on the server. Loading it
// separately also keeps it out of the main bundle.
const BranchMap = dynamic(() => import("./branch-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

export function BranchMapLoader({ branches, label }: { branches: MapBranch[]; label: string }) {
  return <BranchMap branches={branches} label={label} />;
}
