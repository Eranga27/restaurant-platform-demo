import { ImageResponse } from "next/og";

import { getBrand } from "@/lib/data/brand";

// Social share card, generated from the brand settings. Latin text only:
// the built-in font has no Sinhala or Tamil glyphs.
export const alt = "Restaurant share card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const brand = await getBrand();
  const { colors } = brand;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: colors.primary,
        color: colors.primaryForeground,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            background: colors.accent,
            display: "flex",
          }}
        />
        <div
          style={{
            fontSize: 30,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: colors.accent,
          }}
        >
          {brand.tagline}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 112, fontWeight: 700, lineHeight: 1 }}>{brand.name}</div>
        <div style={{ fontSize: 36, maxWidth: 900, lineHeight: 1.3, opacity: 0.85 }}>
          {brand.description}
        </div>
      </div>
    </div>,
    size,
  );
}
