import type { Metadata } from "next";
import { ArrowRight, ShoppingBag } from "lucide-react";

import { DIETARY_TAGS, DietaryBadge } from "@/components/site/dietary-badge";
import { Ornament } from "@/components/site/ornament";
import { Price } from "@/components/site/price";
import { SPICE_LEVELS, SpiceLevelIndicator } from "@/components/site/spice-level";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { defaultBrand } from "@/config/brand";
import { formatLKR } from "@/lib/money";
import en from "@/messages/en.json";

import { TokenSwatch } from "./token-swatch";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

const BRAND_COLOURS: [string, string?][] = [
  ["primary", "primary-foreground"],
  ["secondary", "secondary-foreground"],
  ["highlight", "highlight-foreground"],
  ["background", "foreground"],
  ["card", "card-foreground"],
  ["muted", "muted-foreground"],
  ["accent", "accent-foreground"],
  ["border"],
  ["input"],
  ["ring"],
];

const FEEDBACK_COLOURS: [string, string?][] = [
  ["destructive", "destructive-foreground"],
  ["success", "success-foreground"],
  ["warning", "warning-foreground"],
  ["info", "info-foreground"],
  ["spice-mild"],
  ["spice-medium"],
  ["spice-hot"],
  ["diet-veg"],
  ["diet-vegan"],
  ["diet-halal"],
  ["diet-nuts"],
];

export default function StyleguidePage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-16 px-4 py-12 sm:px-6 lg:py-16">
      <header className="space-y-3">
        <p className="text-sm font-medium tracking-[0.2em] text-secondary uppercase">
          Design system
        </p>
        <h1 className="text-display-xl text-primary">{defaultBrand.name} styleguide</h1>
        <p className="max-w-prose text-muted-foreground">
          Every token and component in the current brand. Not linked from the site and hidden from
          search engines. Use it to check a rebrand at a glance.
        </p>
      </header>

      <Section title="Colour">
        <h3 className="text-lg">Brand and surfaces</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {BRAND_COLOURS.map(([name, text]) => (
            <TokenSwatch key={name} name={name} textToken={text} />
          ))}
        </div>
        <h3 className="text-lg">Feedback, spice and dietary</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {FEEDBACK_COLOURS.map(([name, text]) => (
            <TokenSwatch key={name} name={name} textToken={text} />
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-4">
          <p className="font-display text-display-2xl text-primary">Kottu at midnight</p>
          <p className="font-display text-display-xl">Hoppers, hot off the pan</p>
          <p className="font-display text-display-lg">Slow-cooked black pork curry</p>
          <p className="font-display text-display-md">Wattalappan with kithul treacle</p>
        </div>
        <Separator />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-lg">
              Body large. Our lamprais is wrapped in banana leaf and baked until the rice soaks up
              every drop of the curry.
            </p>
            <p>
              Body. Every curry starts with roasted curry powder ground in-house, fresh pandan and
              curry leaves, and coconut milk pressed that morning.
            </p>
            <p className="text-sm text-muted-foreground">
              Small, muted. Prices include a 10% service charge and VAT where shown.
            </p>
          </div>
          <div className="space-y-3">
            <p lang="si" className="text-lg">
              සිංහල: කොත්තු, ආප්ප, ඉඳිආප්ප සහ වටලප්පන්.
            </p>
            <p lang="ta" className="text-lg">
              தமிழ்: கொத்து, அப்பம், இடியப்பம் மற்றும் வட்டலப்பம்.
            </p>
            <p className="text-sm text-muted-foreground">
              Sinhala and Tamil sample text. Have a native speaker review all translations before a
              client demo.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">
            <ShoppingBag data-icon="inline-start" aria-hidden />
            Order now
          </Button>
          <Button size="lg" variant="secondary">
            Book a table
          </Button>
          <Button size="lg" variant="outline">
            View menu
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Remove</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="icon" variant="outline" aria-label="Add to cart">
            <ShoppingBag aria-hidden />
          </Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Signature</Badge>
          <Badge variant="highlight">Chef&apos;s pick</Badge>
          <Badge variant="secondary">New</Badge>
          <Badge variant="outline">Serves 2</Badge>
          <Badge variant="destructive">Sold out</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {DIETARY_TAGS.map((tag) => (
            <DietaryBadge key={tag} tag={tag} label={en.Dietary[tag]} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-6">
          {SPICE_LEVELS.map((level) => (
            <SpiceLevelIndicator key={level} level={level} label={en.Spice[level]} />
          ))}
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Chicken kottu</CardTitle>
              <CardDescription>
                Chopped godamba roti, chicken curry, leeks and egg, on a hot griddle.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <SpiceLevelIndicator level="hot" label={en.Spice.hot} />
              <DietaryBadge tag="halal" label={en.Dietary.halal} />
            </CardContent>
            <CardFooter className="justify-between">
              <Price cents={1650_00} />
              <Button size="sm">Add</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Egg hoppers (2)</CardTitle>
              <CardDescription>Crisp-edged rice flour hoppers with lunu miris.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <DietaryBadge tag="vegetarian" label={en.Dietary.vegetarian} />
              <Badge variant="highlight">Offer</Badge>
            </CardContent>
            <CardFooter className="justify-between">
              <Price cents={720_00} wasCents={900_00} />
              <Button size="sm">Add</Button>
            </CardFooter>
          </Card>
          <Card aria-busy="true" aria-label="Loading menu item">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </CardHeader>
            <CardFooter className="justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </CardFooter>
          </Card>
        </div>
      </Section>

      <Section title="Forms">
        <div className="grid max-w-2xl gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sg-phone">Mobile number</Label>
            <Input id="sg-phone" type="tel" inputMode="tel" placeholder="07X XXX XXXX" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-landmark">Landmark</Label>
            <Input id="sg-landmark" placeholder="Opposite the temple" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-error">With an error</Label>
            <Input id="sg-error" aria-invalid="true" aria-describedby="sg-error-msg" />
            <p id="sg-error-msg" className="text-sm text-destructive">
              Enter a Sri Lankan mobile number.
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="sg-notes">Special instructions</Label>
            <Textarea id="sg-notes" placeholder="Less chilli, extra gravy..." />
          </div>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-sm font-medium">Spice level</legend>
            <RadioGroup defaultValue="medium">
              {SPICE_LEVELS.map((level) => (
                <div key={level} className="flex items-center gap-2">
                  <RadioGroupItem value={level} id={`sg-spice-${level}`} />
                  <Label htmlFor={`sg-spice-${level}`} className="font-normal">
                    <SpiceLevelIndicator level={level} label={en.Spice[level]} />
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="flex items-start gap-2">
            <Checkbox id="sg-cutlery" />
            <Label htmlFor="sg-cutlery" className="font-normal">
              Include cutlery
            </Label>
          </div>
        </div>
      </Section>

      <Section title="Money">
        <dl className="grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm tabular-nums">
          <dt>Subtotal</dt>
          <dd className="text-right">{formatLKR(2370_00)}</dd>
          <dt>Service charge (10%)</dt>
          <dd className="text-right">{formatLKR(237_00)}</dd>
          <dt>VAT (18%)</dt>
          <dd className="text-right">{formatLKR(469_26)}</dd>
          <dt>Delivery</dt>
          <dd className="text-right">{formatLKR(250_00)}</dd>
          <dt className="border-t pt-2 font-semibold">Total</dt>
          <dd className="border-t pt-2 text-right font-semibold">{formatLKR(3326_26)}</dd>
        </dl>
      </Section>

      <Section title="Ornament">
        <p className="max-w-2xl text-muted-foreground">
          A lotus divider in the spirit of palapethi borders: above section headings, as the dish
          photo placeholder, and as a repeating border along the footer.
        </p>
        <div className="flex flex-wrap items-center gap-8">
          <Ornament />
          <Ornament className="w-20 text-primary" />
          <div className="w-64 rounded-xl bg-primary py-3">
            <div aria-hidden className="lotus-border opacity-80" />
          </div>
        </div>
      </Section>

      <Section title="Motion">
        <ul className="max-w-2xl list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            Splash: once per tab on the public pages, timed in CSS (1.15 s, then a 0.45 s fade).
          </li>
          <li>
            Scroll reveals: add <code>data-reveal</code> (rise),{" "}
            <code>data-reveal=&quot;fade&quot;</code> or <code>data-reveal=&quot;zoom&quot;</code>{" "}
            to a block; items entering together are staggered by 90 ms.
          </li>
          <li>
            Page changes fade the old page out (150 ms) and raise the new one in (360 ms); the
            header stays still.
          </li>
          <li>
            <code>.parallax</code> moves photos with the scroll and <code>.hero-recede</code> sinks
            the home video back as the next section covers it, where the browser supports
            scroll-driven animations.
          </li>
          <li>Everything is switched off for visitors who ask for reduced motion.</li>
        </ul>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6" aria-labelledby={`sg-${title.toLowerCase()}`}>
      <h2 id={`sg-${title.toLowerCase()}`} className="text-display-md">
        {title}
      </h2>
      {children}
    </section>
  );
}
