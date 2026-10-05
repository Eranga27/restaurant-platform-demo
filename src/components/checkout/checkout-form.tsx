"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, Bike, CreditCard, Gift, LocateFixed, MapPin, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { placeOrderAction } from "@/app/[locale]/(site)/checkout/actions";
import { submitPaymentForm } from "@/components/payments/submit-payment-form";
import { OpenStatus } from "@/components/site/open-status";
import { Turnstile } from "@/components/security/turnstile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { useCart, useCartHydrated } from "@/lib/cart/store";
import type { DistrictOption } from "@/lib/data/places";
import { byDistance, type LatLng } from "@/lib/geo";
import type { OpeningHours } from "@/lib/hours";
import type { QuoteRequest } from "@/lib/orders/schema";
import { slotToIso } from "@/lib/orders/slots";
import { formatLKR } from "@/lib/money";
import { normalizeSriLankanPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

import { DeliveryMap } from "./delivery-map-loader";
import { OrderSummary } from "./order-summary";
import { SchedulePicker, type Schedule } from "./schedule-picker";
import { useQuote } from "./use-quote";

export type SavedAddressView = {
  id: string;
  label: string;
  district: string;
  city: string;
  line: string;
  landmark: string | null;
  lat: number;
  lng: number;
};

export type CheckoutBranch = {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  lat: number;
  lng: number;
  deliveryRadiusKm: number;
  openingHours: OpeningHours;
  isAcceptingOrders: boolean;
};

type CheckoutFormProps = {
  branches: CheckoutBranch[];
  districts: DistrictOption[];
  features: { delivery: boolean; pickup: boolean };
  /** Which payment methods this deployment offers. */
  payments: { online: boolean; cash: boolean };
  charges: { serviceChargePercent: number; vatPercent: number; minimumOrderCents: number };
  initialContact: { name: string; phone: string; email: string };
  signedIn: boolean;
  /** Signed-in customers' saved addresses and points (null points: loyalty off or signed out). */
  account: {
    addresses: SavedAddressView[];
    loyalty: {
      balance: number;
      pointValueCents: number;
      pointPerCents: number;
      maxRedeemBps: number;
    } | null;
  };
  nonce?: string;
};

const fieldsSchema = z.object({
  name: z.string().trim().min(1, "required").max(120),
  phone: z
    .string()
    .trim()
    .min(1, "required")
    .refine((v) => normalizeSriLankanPhone(v) !== null, "invalidPhone"),
  email: z.email("invalidEmail").max(254),
  district: z.string(),
  city: z.string().max(80),
  line: z.string().max(300),
  landmark: z.string().max(200),
  notes: z.string().max(500),
});
type Fields = z.infer<typeof fieldsSchema>;

type SubmitError =
  | "fixErrors"
  | "rate-limited"
  | "bot-check"
  | "promo-exhausted"
  | "loyalty-changed"
  | "payment-unavailable"
  | "unavailable"
  | "unknown";

export function CheckoutForm(props: CheckoutFormProps) {
  const {
    branches,
    districts,
    features,
    payments,
    charges,
    initialContact,
    signedIn,
    account,
    nonce,
  } = props;
  const t = useTranslations("Checkout");
  const locale = useLocale();
  const router = useRouter();
  const hydrated = useCartHydrated();
  const cart = useCart();

  const [location, setLocation] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState<"idle" | "locating" | "error">("idle");
  const [schedule, setSchedule] = useState<Schedule>({ mode: "asap" });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "payhere">(
    payments.online ? "payhere" : "cod",
  );
  const [usePoints, setUsePoints] = useState(false);
  const [saveAddressAs, setSaveAddressAs] = useState<string | null>(null);
  // One key per checkout: a retried submit can never create a second order.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(fieldsSchema),
    defaultValues: { ...initialContact, district: "", city: "", line: "", landmark: "", notes: "" },
  });

  const type = !features.delivery ? "pickup" : !features.pickup ? "delivery" : cart.type;
  const branchIds = branches.map((b) => b.id);
  const branchId =
    cart.branchId && branchIds.includes(cart.branchId) ? cart.branchId : branchIds[0]!;
  const branch = branches.find((b) => b.id === branchId)!;

  const nearest = location
    ? byDistance(
        branches.filter((b) => b.isAcceptingOrders),
        location,
      )[0]
    : undefined;

  function pickLocation(next: LatLng) {
    setLocation(next);
    // Deliver from the nearest branch that covers this address.
    const covering = byDistance(
      branches.filter((b) => b.isAcceptingOrders),
      next,
    ).find((b) => b.distanceKm <= b.deliveryRadiusKm);
    if (covering) cart.setBranch(covering.id);
  }

  function locate() {
    if (!("geolocation" in navigator)) return setLocating("error");
    setLocating("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pickLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating("idle");
      },
      () => setLocating("error"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const request: QuoteRequest | null =
    hydrated && cart.lines.length > 0
      ? {
          branchId,
          type,
          lines: cart.lines.map(
            ({ menuItemId, selection, spiceLevel, instructions, quantity }) => ({
              menuItemId,
              selection,
              spiceLevel,
              instructions,
              quantity,
            }),
          ),
          promoCode: cart.promoCode,
          location: type === "delivery" ? location : null,
          scheduledFor: schedule.mode === "later" ? slotToIso(schedule.date, schedule.time) : null,
          loyaltyPoints: usePoints && account.loyalty ? account.loyalty.balance : 0,
        }
      : null;
  const { quote, setQuote, loading } = useQuote(request, locale);

  const district = useWatch({ control, name: "district" });
  const cityOptions = districts.find((d) => d.name === district)?.cities ?? [];

  const onSubmit = handleSubmit(async (values) => {
    if (!request) return;
    setSubmitError(null);
    if (type === "delivery") {
      let missing = false;
      if (!values.district) {
        setError("district", { message: "required" });
        missing = true;
      }
      if (values.line.trim().length < 3) {
        setError("line", { message: "required" });
        missing = true;
      }
      if (!values.city.trim()) {
        setError("city", { message: "required" });
        missing = true;
      }
      if (missing || !location) {
        setSubmitError("fixErrors");
        return;
      }
    }

    setPlacing(true);
    const response = await placeOrderAction({
      ...request,
      contact: { name: values.name, phone: values.phone, email: values.email },
      address:
        type === "delivery"
          ? {
              district: values.district,
              city: values.city.trim(),
              line: values.line.trim(),
              landmark: values.landmark.trim() || null,
            }
          : null,
      notes: values.notes.trim() || null,
      paymentMethod,
      saveAddressAs: type === "delivery" && saveAddressAs?.trim() ? saveAddressAs.trim() : null,
      idempotencyKey,
      turnstileToken,
      locale,
    }).catch(() => ({ ok: false as const, error: "unknown" as const }));

    if (response.ok) {
      cart.clear();
      // Leave the button spinning: the browser is on its way to PayHere or the tracking page.
      if (response.payment) submitPaymentForm(response.payment);
      else router.push(response.nextPath);
      return;
    }

    setPlacing(false);
    // Tokens are single-use: get a fresh one for the next attempt.
    setTurnstileToken(null);
    setTurnstileReset((n) => n + 1);
    if (response.error === "issues") setQuote(response.quote);
    else if (response.error === "invalid") {
      for (const field of response.fields) {
        const name = field.replace(/^(contact|address)\./, "") as keyof Fields;
        if (name in fieldsSchema.shape) setError(name, { message: "required" });
      }
      setSubmitError("fixErrors");
    } else setSubmitError(response.error);
  });

  const fieldError = (name: keyof Fields) => {
    const message = errors[name]?.message;
    if (!message) return null;
    return (
      <p id={`${name}-error`} className="text-sm text-destructive">
        {message === "invalidPhone"
          ? t("invalidPhone")
          : message === "invalidEmail"
            ? t("invalidEmail")
            : t("required")}
      </p>
    );
  };
  const describedBy = (name: keyof Fields, help?: string) =>
    [errors[name] ? `${name}-error` : null, help].filter(Boolean).join(" ") || undefined;

  if (!hydrated) return <CheckoutSkeleton />;

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed p-10 text-center">
        <p className="font-display text-2xl">{t("emptyTitle")}</p>
        <Button asChild size="lg">
          <Link href="/menu">{t("editOrder")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]"
    >
      <div className="space-y-6">
        {features.delivery && features.pickup && (
          <Section title={t("orderType")}>
            <RadioGroup
              value={type}
              onValueChange={(v) => cart.setType(v as "delivery" | "pickup")}
              className="grid grid-cols-2 gap-3"
            >
              {(
                [
                  ["delivery", Bike, t("delivery"), t("deliveryHint")],
                  ["pickup", Store, t("pickup"), t("pickupHint")],
                ] as const
              ).map(([value, Icon, label, hint]) => (
                <Label
                  key={value}
                  htmlFor={`type-${value}`}
                  className="flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-4 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                >
                  <span className="flex w-full items-center justify-between">
                    <Icon aria-hidden className="size-5 text-primary" />
                    <RadioGroupItem value={value} id={`type-${value}`} />
                  </span>
                  <span className="pt-1 font-semibold">{label}</span>
                  <span className="text-sm text-muted-foreground">{hint}</span>
                </Label>
              ))}
            </RadioGroup>
          </Section>
        )}

        {type === "delivery" ? (
          <Section title={t("whereTitle")}>
            {account.addresses.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("savedAddresses")}</p>
                <div className="flex flex-wrap gap-2">
                  {account.addresses.map((a) => (
                    <Button
                      key={a.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setValue("district", a.district);
                        setValue("city", a.city);
                        setValue("line", a.line);
                        setValue("landmark", a.landmark ?? "");
                        pickLocation({ lat: a.lat, lng: a.lng });
                      }}
                    >
                      <MapPin data-icon="inline-start" aria-hidden />
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{t("mapHelp")}</p>
            <div className="h-72 overflow-hidden rounded-xl border sm:h-80">
              <DeliveryMap
                value={location}
                onChange={pickLocation}
                label={t("mapLabel")}
                areas={branches.map((b) => ({
                  id: b.id,
                  name: b.name,
                  lat: b.lat,
                  lng: b.lng,
                  radiusKm: b.deliveryRadiusKm,
                }))}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={locate}
                disabled={locating === "locating"}
              >
                <LocateFixed data-icon="inline-start" aria-hidden />
                {locating === "locating" ? t("locating") : t("useMyLocation")}
              </Button>
              <p role="status" className="flex items-center gap-2 text-sm">
                {locating === "error" ? (
                  <span className="text-destructive">{t("locationError")}</span>
                ) : !location ? (
                  <span className="text-muted-foreground">{t("pinNeeded")}</span>
                ) : nearest && nearest.distanceKm <= nearest.deliveryRadiusKm ? (
                  <>
                    <MapPin aria-hidden className="size-4 text-success" />
                    <span className="text-success">
                      {t("deliveringFrom", {
                        branch: branch.name,
                        km: (quote?.distanceKm ?? nearest.distanceKm).toFixed(1),
                      })}
                    </span>
                  </>
                ) : nearest ? (
                  <span className="text-destructive">
                    {t("outsideArea", { branch: nearest.name, radius: nearest.deliveryRadiusKm })}
                  </span>
                ) : null}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <span id="district-label" className="text-sm font-medium">
                  {t("district")}
                </span>
                <Controller
                  control={control}
                  name="district"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        aria-labelledby="district-label"
                        aria-invalid={errors.district ? true : undefined}
                        aria-describedby={describedBy("district")}
                        className="h-10 w-full bg-card"
                      >
                        <SelectValue placeholder={t("chooseDistrict")} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-72">
                        {districts.map((d) => (
                          <SelectItem key={d.name} value={d.name}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {fieldError("district")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t("city")}</Label>
                <Input
                  id="city"
                  list="city-options"
                  autoComplete="address-level2"
                  aria-invalid={errors.city ? true : undefined}
                  aria-describedby={describedBy("city")}
                  {...register("city")}
                />
                <datalist id="city-options">
                  {cityOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {fieldError("city")}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="line">{t("address")}</Label>
                <Input
                  id="line"
                  autoComplete="street-address"
                  placeholder={t("addressPlaceholder")}
                  aria-invalid={errors.line ? true : undefined}
                  aria-describedby={describedBy("line")}
                  {...register("line")}
                />
                {fieldError("line")}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="landmark">{t("landmark")}</Label>
                <Input
                  id="landmark"
                  placeholder={t("landmarkPlaceholder")}
                  {...register("landmark")}
                />
              </div>
            </div>
            {signedIn && account.addresses.length < 10 && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={saveAddressAs !== null}
                    onCheckedChange={(checked) => setSaveAddressAs(checked ? t("homeLabel") : null)}
                  />
                  {t("saveAddress")}
                </label>
                {saveAddressAs !== null && (
                  <Input
                    aria-label={t("addressLabel")}
                    value={saveAddressAs}
                    maxLength={40}
                    onChange={(e) => setSaveAddressAs(e.target.value)}
                    className="h-9 w-40"
                  />
                )}
              </div>
            )}
          </Section>
        ) : (
          <Section title={t("pickupFrom")}>
            <RadioGroup value={branchId} onValueChange={cart.setBranch} className="gap-3">
              {branches.map((b) => (
                <Label
                  key={b.id}
                  htmlFor={`branch-${b.id}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5",
                    !b.isAcceptingOrders && "opacity-60",
                  )}
                >
                  <RadioGroupItem
                    value={b.id}
                    id={`branch-${b.id}`}
                    className="mt-1"
                    disabled={!b.isAcceptingOrders}
                  />
                  <span className="space-y-1">
                    <span className="block font-semibold">{b.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {b.addressLine}, {b.city}
                    </span>
                    <OpenStatus hours={b.openingHours} />
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </Section>
        )}

        <Section title={t("whenTitle")}>
          <SchedulePicker hours={branch.openingHours} value={schedule} onChange={setSchedule} />
        </Section>

        <Section title={t("contactTitle")}>
          {!signedIn && (
            <p className="text-sm text-muted-foreground">
              {t.rich("signInPrompt", {
                link: (chunks) => (
                  <Link
                    href={{ pathname: "/login", query: { next: "/checkout" } }}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                autoComplete="name"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={describedBy("name")}
                {...register("name")}
              />
              {fieldError("name")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="077 123 4567"
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={describedBy("phone", "phone-help")}
                {...register("phone")}
              />
              <p id="phone-help" className="text-xs text-muted-foreground">
                {t("phoneHelp")}
              </p>
              {fieldError("phone")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={describedBy("email", "email-help")}
                {...register("email")}
              />
              <p id="email-help" className="text-xs text-muted-foreground">
                {t("emailHelp")}
              </p>
              {fieldError("email")}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea id="notes" rows={2} maxLength={500} {...register("notes")} />
            </div>
          </div>
        </Section>

        {account.loyalty && (account.loyalty.balance > 0 || quote) && (
          <Section title={t("pointsTitle")}>
            {account.loyalty.balance > 0 && (
              <label className="flex items-start gap-3 text-sm">
                <Switch
                  checked={usePoints}
                  onCheckedChange={setUsePoints}
                  aria-describedby="points-help"
                />
                <span>
                  <span className="flex items-center gap-2 font-semibold">
                    <Gift aria-hidden className="size-4 text-primary" />
                    {t("usePoints", { points: account.loyalty.balance })}
                  </span>
                  <span id="points-help" className="block text-muted-foreground">
                    {t("pointsHelp", {
                      value: formatLKR(account.loyalty.balance * account.loyalty.pointValueCents),
                      share: account.loyalty.maxRedeemBps / 100,
                    })}
                  </span>
                </span>
              </label>
            )}
            {quote && (
              <p className="text-sm text-muted-foreground">
                {t("pointsEarn", {
                  points: Math.floor(
                    (quote.totals.subtotalCents -
                      quote.totals.discountCents -
                      quote.totals.loyaltyDiscountCents) /
                      account.loyalty.pointPerCents,
                  ),
                })}
              </p>
            )}
          </Section>
        )}

        <Section title={t("paymentTitle")}>
          {payments.online || payments.cash ? (
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as "cod" | "payhere")}
              className="gap-3"
            >
              {payments.online && (
                <PaymentOption
                  id="pay-online"
                  value="payhere"
                  selected={paymentMethod === "payhere"}
                  icon={<CreditCard aria-hidden className="size-4" />}
                  title={t("payOnline")}
                  hint={t("payOnlineHint")}
                />
              )}
              {payments.cash && (
                <PaymentOption
                  id="pay-cod"
                  value="cod"
                  selected={paymentMethod === "cod"}
                  icon={<Banknote aria-hidden className="size-4" />}
                  title={type === "delivery" ? t("cod") : t("codPickup")}
                  hint={t("codHint")}
                />
              )}
            </RadioGroup>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noPaymentMethod")}</p>
          )}
        </Section>
      </div>

      <OrderSummary
        lines={cart.lines}
        quote={quote}
        loading={loading}
        branchName={branch.name}
        type={type}
        charges={charges}
        promoCode={cart.promoCode}
        onPromoChange={cart.setPromoCode}
        onRemoveLine={cart.remove}
        submitError={submitError}
        paymentMethod={paymentMethod}
        placing={placing}
        canPlace={Boolean(
          quote &&
          quote.issues.length === 0 &&
          !loading &&
          turnstileToken &&
          (payments.online || payments.cash),
        )}
        turnstile={
          <Turnstile
            nonce={nonce}
            action="checkout"
            onToken={setTurnstileToken}
            resetKey={turnstileReset}
          />
        }
        waitingForTurnstile={!turnstileToken}
      />
    </form>
  );
}

function PaymentOption(props: {
  id: string;
  value: "cod" | "payhere";
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Label
      htmlFor={props.id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 font-normal transition-colors",
        props.selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <RadioGroupItem value={props.value} id={props.id} className="mt-1" />
      <span className="space-y-1">
        <span className="flex items-center gap-2 font-semibold">
          {props.icon}
          {props.title}
        </span>
        <span className="block text-sm text-muted-foreground">{props.hint}</span>
      </span>
    </Label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
      <h2 className="font-display text-xl text-primary">{title}</h2>
      {children}
    </section>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]" aria-hidden>
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
