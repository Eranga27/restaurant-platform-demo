import type { Brand } from "@/config/brand";
import type { BranchView, MenuView } from "@/lib/data/catalogue";
import { DAY_KEYS } from "@/lib/hours";
import { publicEnv } from "@/lib/public-env";

/** schema.org day names for openingHoursSpecification. */
const SCHEMA_DAYS: Record<(typeof DAY_KEYS)[number], string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const absolute = (path: string) => `${publicEnv.siteUrl}${path}`;

/** `Restaurant` JSON-LD for the chain, with each branch as a department. */
export function restaurantJsonLd(brand: Brand, branches: BranchView[], menuPath: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": absolute("/#restaurant"),
    name: brand.name,
    description: brand.description,
    url: absolute("/"),
    logo: absolute(brand.logo.mark),
    telephone: brand.contact.phone,
    email: brand.contact.email,
    servesCuisine: "Sri Lankan",
    priceRange: "Rs. 200 – Rs. 4,000",
    currenciesAccepted: "LKR",
    paymentAccepted: "Cash, Credit Card, Mobile Wallet",
    acceptsReservations: brand.features.reservations,
    hasMenu: absolute(menuPath),
    department: branches.map((b) => ({
      "@type": "Restaurant",
      name: `${brand.name}, ${b.name}`,
      telephone: b.phone,
      servesCuisine: "Sri Lankan",
      address: {
        "@type": "PostalAddress",
        streetAddress: b.addressLine,
        addressLocality: b.city,
        addressRegion: b.district,
        addressCountry: "LK",
      },
      geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng },
      openingHoursSpecification: DAY_KEYS.flatMap((day) =>
        b.openingHours[day].map(([opens, closes]) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: `https://schema.org/${SCHEMA_DAYS[day]}`,
          opens,
          closes,
        })),
      ),
    })),
  };
}

/** `Menu` JSON-LD with a section per category. */
export function menuJsonLd(brand: Brand, menu: MenuView, menuPath: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `${brand.name} menu`,
    url: absolute(menuPath),
    inLanguage: ["en", "si", "ta"],
    hasMenuSection: menu.categories.map((category) => ({
      "@type": "MenuSection",
      name: category.name,
      description: category.description || undefined,
      hasMenuItem: category.items.map((item) => ({
        "@type": "MenuItem",
        name: item.name,
        description: item.description || undefined,
        image: item.imageUrl ?? undefined,
        suitableForDiet: [
          item.dietaryTags.includes("vegetarian") && "https://schema.org/VegetarianDiet",
          item.dietaryTags.includes("vegan") && "https://schema.org/VeganDiet",
          item.dietaryTags.includes("halal") && "https://schema.org/HalalDiet",
        ].filter(Boolean),
        offers: {
          "@type": "Offer",
          price: (item.basePriceCents / 100).toFixed(2),
          priceCurrency: "LKR",
        },
      })),
    })),
  };
}
