"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type I18nValue = { en: string; si: string; ta: string };

export const emptyI18n = (): I18nValue => ({ en: "", si: "", ta: "" });

export function toI18nValue(
  value: { en?: string; si?: string; ta?: string } | null | undefined,
): I18nValue {
  return { en: value?.en ?? "", si: value?.si ?? "", ta: value?.ta ?? "" };
}

const LANGUAGES = [
  ["en", "English", "en"],
  ["si", "සිංහල", "si"],
  ["ta", "தமிழ்", "ta"],
] as const;

/** English, Sinhala and Tamil versions of one text. Empty translations fall back to English. */
export function I18nFields({
  id,
  label,
  value,
  onChange,
  multiline = false,
  required = false,
}: {
  id: string;
  label: string;
  value: I18nValue;
  onChange: (value: I18nValue) => void;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {LANGUAGES.map(([key, name, lang]) => {
          const props = {
            id: `${id}-${key}`,
            lang,
            value: value[key],
            required: required && key === "en",
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              onChange({ ...value, [key]: e.target.value }),
          };
          return (
            <div key={key} className="space-y-1">
              <Label htmlFor={props.id} className="text-xs text-muted-foreground">
                {name}
                {key === "en" && required ? " (required)" : ""}
              </Label>
              {multiline ? (
                <Textarea {...props} rows={3} maxLength={600} />
              ) : (
                <Input {...props} maxLength={120} />
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** "Chicken kottu" → "chicken-kottu". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
