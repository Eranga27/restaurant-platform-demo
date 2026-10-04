import type { NextConfig } from "next";

/**
 * Security headers for every response. The Content-Security-Policy is set
 * separately in `src/proxy.ts` because some routes need a per-request nonce.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Geolocation for "use my location" on the delivery map; payment for PayHere.
    value:
      "camera=(), microphone=(), usb=(), serial=(), bluetooth=(), browsing-topics=(), geolocation=(self), payment=(self)",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // Dev-only logging of Server Action arguments would print customers' names,
  // phone numbers and addresses to the terminal.
  logging: { serverFunctions: false },
  turbopack: {
    resolveAlias: {
      // What next-intl's createNextIntlPlugin() does when no experimental options are used.
      // Set directly because the plugin eagerly loads @swc/core, whose self-extracting
      // native binary refuses to load from folders other users can write to (common on
      // Windows dev machines). We build with Turbopack only, so no webpack alias is needed.
      "next-intl/config": "./src/i18n/request.ts",
    },
  },
  experimental: {
    // One 404 for URLs outside every root layout (the site and staff areas each have their own).
    globalNotFound: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
