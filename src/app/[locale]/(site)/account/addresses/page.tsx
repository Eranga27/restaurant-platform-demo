import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AccountShell } from "@/components/account/account-shell";
import { AddressBook } from "@/components/account/address-book";
import type { Locale } from "@/i18n/routing";
import { getSavedAddresses } from "@/lib/account/addresses";
import { getProfile, requireCustomer } from "@/lib/account/data";
import { getDistricts } from "@/lib/data/places";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Account");
  return { title: t("tabs.addresses"), robots: { index: false, follow: false } };
}

export default async function AccountAddressesPage({
  params,
}: PageProps<"/[locale]/account/addresses">) {
  const locale = (await params).locale as Locale;
  const user = await requireCustomer("/account/addresses", locale);
  const [addresses, districts, profile] = await Promise.all([
    getSavedAddresses(),
    getDistricts(),
    getProfile(user.id),
  ]);

  return (
    <AccountShell current="addresses" name={profile.name || user.name || ""}>
      <AddressBook addresses={addresses} districts={districts} />
    </AccountShell>
  );
}
