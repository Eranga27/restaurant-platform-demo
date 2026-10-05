"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { submitReviewAction } from "@/app/[locale]/(site)/track/[token]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** "How was it?" after a completed order. Reviews are shown once an admin approves them. */
export function ReviewForm({
  token,
  defaultName,
  existing,
}: {
  token: string;
  defaultName: string;
  existing: { rating: number } | null;
}) {
  const t = useTranslations("Review");
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [name, setName] = useState(defaultName.split(" ")[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(existing !== null);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
        <p className="font-semibold">{t("thanks")}</p>
        <p className="text-sm text-muted-foreground">{t("thanksBody")}</p>
      </section>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await submitReviewAction({ token, rating, body, name }).catch(() => ({
      ok: false as const,
      error: "unknown" as const,
    }));
    setBusy(false);
    if (result.ok || result.error === "already-reviewed") setDone(true);
    else setError(t(`errors.${result.error}`));
  }

  return (
    <section
      aria-labelledby="review-title"
      className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6"
    >
      <form onSubmit={submit} className="space-y-4">
        <h2 id="review-title" className="font-display text-xl text-primary">
          {t("title")}
        </h2>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("rating")}</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  className="sr-only"
                />
                <Star
                  aria-hidden
                  className={cn(
                    "size-8",
                    n <= rating ? "fill-highlight text-highlight" : "text-muted-foreground",
                  )}
                />
                <span className="sr-only">{t("stars", { count: n })}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="review-body">{t("body")}</Label>
          <Textarea
            id="review-body"
            rows={3}
            minLength={10}
            maxLength={1000}
            value={body}
            placeholder={t("bodyPlaceholder")}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-name">{t("name")}</Label>
          <Input
            id="review-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy || rating === 0 || body.trim().length < 10 || !name.trim()}
        >
          {t("submit")}
        </Button>
      </form>
    </section>
  );
}
