import {
  ArrowRight,
  CalendarDays,
  ChefHat,
  Gift,
  Languages,
  LayoutDashboard,
  MapPin,
  Palette,
  ShieldCheck,
  Smartphone,
  UtensilsCrossed,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import NextLink from "next/link";
import { notFound } from "next/navigation";

import { Ornament } from "@/components/site/ornament";
import { Button } from "@/components/ui/button";
import { getBrand } from "@/lib/data/brand";
import { publicEnv } from "@/lib/public-env";

/**
 * A guided tour for client meetings (docs/PLAN.md §11), shown only in demo
 * mode. English, like the staff screens. Never lists staff logins: those are
 * handed over in person.
 */

export const metadata: Metadata = {
  title: "Demo tour",
  robots: { index: false, follow: false },
};

const STEPS = [
  {
    icon: Languages,
    title: "Switch the language",
    body: "Every customer page and email is in English, Sinhala and Tamil. Try the language menu in the header.",
    links: [
      { href: "/si", label: "සිංහල" },
      { href: "/ta", label: "தமிழ்" },
    ],
  },
  {
    icon: UtensilsCrossed,
    title: "Order a meal",
    body: "Pick a chicken kottu, choose Sri Lankan Hot, add a wattalappan and check out. Drop a pin for delivery, or collect from a branch. Try the code WELCOME10 on orders over Rs. 2,000. Pay cash, or by card through PayHere's sandbox: the payment page lists test cards.",
    links: [{ href: "/menu?item=chicken-kottu", label: "Start with kottu" }],
  },
  {
    icon: MapPin,
    title: "Watch it live",
    body: "The tracking page updates by itself as the branch accepts and prepares the order. Keep it open on your phone.",
    links: [],
  },
  {
    icon: ChefHat,
    title: "See the kitchen's side",
    body: "On a laptop, open the branch dashboard: new orders chime and appear straight away; accept one and move it to Preparing. Staff sign in with their own accounts; ask us for a demo login.",
    links: [{ href: "/dashboard", label: "Branch dashboard" }],
  },
  {
    icon: CalendarDays,
    title: "Book a table, plan an event",
    body: "Book a table for six (confirmed straight away), then send a birthday party or almsgiving enquiry and see the quote arrive.",
    links: [
      { href: "/reservations", label: "Book a table" },
      { href: "/events", label: "Plan an event" },
    ],
  },
  {
    icon: LayoutDashboard,
    title: "Run the restaurant",
    body: "In the admin panel, mark a dish sold out, change a price, create a promo code and look at the sales report. Admins use two-step sign-in.",
    links: [{ href: "/admin", label: "Admin panel" }],
  },
  {
    icon: Gift,
    title: "Come back as a regular",
    body: "Create an account to save addresses, earn loyalty points, see past orders and order them again in one tap, and review a completed order.",
    links: [{ href: "/signup", label: "Create an account" }],
  },
  {
    icon: Palette,
    title: "Make it yours",
    body: "Name, logo, colours, contact details, charges and opening rules all change from Admin → Settings, with no developer and no downtime. A new restaurant goes live in days, not months.",
    links: [],
  },
  {
    icon: Smartphone,
    title: "Install it",
    body: 'On a phone, use "Add to Home screen": the site opens like an app, and shows a friendly page when the connection drops.',
    links: [],
  },
];

const INCLUDED = [
  "Delivery and pickup, map pins, delivery radius and fees",
  "Scheduled orders within opening hours, Poya day rules",
  "PayHere card and wallet payments, or cash",
  "Live order tracking without an account",
  "Branch dashboard with sound, push and Telegram alerts",
  "Table bookings with capacity rules",
  "Events and catering quotes with deposits",
  "Admin panel: menu, branches, promos, staff, reports, audit log",
  "Customer accounts, saved addresses, loyalty points, reviews",
  "English, Sinhala and Tamil",
  "Installable on phones, works on slow connections",
  "Security: two-step sign-in for managers, database-level access rules, rate limits",
];

export default async function DemoPage() {
  if (!publicEnv.demoMode) notFound();
  const brand = await getBrand();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-16 px-4 py-12 sm:px-6 lg:py-16">
      <header className="space-y-5">
        <NextLink href="/" className="inline-flex items-center gap-2.5">
          <Image src={brand.logo.mark} alt="" width={40} height={40} />
          <span className="font-display text-2xl text-primary">{brand.name}</span>
        </NextLink>
        <Ornament />
        <h1 className="text-display-xl text-balance text-primary">A tour of the platform</h1>
        <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
          {brand.name} is a fictional restaurant: everything here is a working demonstration of an
          ordering, booking and management platform built for Sri Lankan restaurants. No real
          orders, payments or bookings are made.
        </p>
        <Button asChild size="lg">
          <NextLink href="/">
            Open the restaurant site
            <ArrowRight data-icon="inline-end" aria-hidden />
          </NextLink>
        </Button>
      </header>

      <section aria-labelledby="steps" className="space-y-6">
        <h2 id="steps" className="text-display-md text-primary">
          Try it in ten minutes
        </h2>
        <ol className="grid gap-4 md:grid-cols-2">
          {STEPS.map(({ icon: Icon, title, body, links }, i) => (
            <li key={title} className="flex gap-4 rounded-2xl border bg-card p-5 shadow-soft">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 font-display text-xl">
                  <Icon aria-hidden className="size-5 text-secondary" />
                  {title}
                </h3>
                <p className="text-pretty text-muted-foreground">{body}</p>
                {links.length > 0 && (
                  <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    {links.map((link) => (
                      <NextLink
                        key={link.href}
                        href={link.href}
                        className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        {link.label}
                        <ArrowRight aria-hidden className="size-4" />
                      </NextLink>
                    ))}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="included" className="space-y-6">
        <h2 id="included" className="text-display-md text-primary">
          What&apos;s included
        </h2>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {INCLUDED.map((item) => (
            <li key={item} className="flex gap-3">
              <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
