"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Reads `?item=slug` (shareable dish links, back/forward) and reports it.
 * Kept separate and wrapped in Suspense by the parent so reading search params
 * doesn't stop the menu itself from being prerendered.
 */
export function ItemQuerySync({ onChange }: { onChange: (slug: string | null) => void }) {
  const slug = useSearchParams().get("item");
  useEffect(() => {
    onChange(slug);
  }, [slug, onChange]);
  return null;
}
