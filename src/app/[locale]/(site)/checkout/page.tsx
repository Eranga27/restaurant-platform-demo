import { PhoneCall } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Ornament } from "@/components/site/ornament";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { getDistricts } from "@/lib/data/places";
import { getSavedAddresses } from "@/lib/account/addresses";
import { loyaltyBalance, orderingEnabled } from "@/lib/orders/service";
import { onlinePaymentsEnabled } from "@/lib/payments/service";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

// Per-request nonce (strict CSP) and the signed-in user: always dynamic.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Checkout");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const locale = (await params).locale as Locale;
  const [t, nav] = await Promise.all([getTranslations("Checkout"), getTranslations("Nav")]);

  if (!orderingEnabled()) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-20 text-center sm:px-6">
        <PhoneCall aria-hidden className="mx-auto size-10 text-muted-foreground" />
        <h1 className="text-display-md text-primary">{t("unavailableTitle")}</h1>
        <p className="text-muted-foreground">{t("unavailableBody")}</p>
        <Button asChild variant="outline">
          <Link href="/branches">{nav("branches")}</Link>
        </Button>
      </div>
    );
  }

  const [brand, branches, districts, user, nonce] = await Promise.all([
    getBrand(),
    getBranches(locale),
    getDistricts(),
    getCurrentUser(),
    headers().then((h) => h.get("x-nonce") ?? undefined),
  ]);

  // Saved addresses and points, for signed-in customers.
  const [addresses, points] = user
    ? await Promise.all([getSavedAddresses(), loyaltyBalance(user.id)])
    : [[], 0];

  // Prefill from the signed-in customer's profile.
  let phone = "";
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle();
    phone = typeof data?.phone === "string" ? data.phone : "";
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
      <Ornament className="mb-3" />
      <h1 className="mb-8 text-display-xl text-primary">{t("title")}</h1>
      <CheckoutForm
        branches={branches.map((b) => ({
          id: b.id,
          name: b.name,
          addressLine: b.addressLine,
          city: b.city,
          lat: b.lat,
          lng: b.lng,
          deliveryRadiusKm: b.deliveryRadiusKm,
          openingHours: b.openingHours,
          isAcceptingOrders: b.isAcceptingOrders,
        }))}
        districts={districts}
        features={{ delivery: brand.features.delivery, pickup: brand.features.pickup }}
        payments={{ online: onlinePaymentsEnabled(), cash: brand.features.cashOnDelivery }}
        charges={{
          serviceChargePercent: brand.charges.serviceChargeBps / 100,
          vatPercent: brand.charges.vatBps / 100,
          minimumOrderCents: brand.charges.minimumOrderCents,
        }}
        initialContact={{ name: user?.name ?? "", phone, email: user?.email ?? "" }}
        signedIn={user !== null}
        account={{
          addresses,
          loyalty:
            user && brand.features.loyalty
              ? {
                  balance: points,
                  pointValueCents: brand.loyalty.pointValueCents,
                  pointPerCents: brand.loyalty.pointPerCents,
                  maxRedeemBps: brand.loyalty.maxRedeemBps,
                }
              : null,
        }}
        nonce={nonce}
      />
    </div>
  );
}
