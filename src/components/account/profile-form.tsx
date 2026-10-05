"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/[locale]/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhone } from "@/lib/phone";

export function ProfileForm({ initial }: { initial: { name: string; phone: string } }) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ? formatPhone(initial.phone) : "");
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await updateProfileAction({ name, phone }).catch(() => ({
      ok: false as const,
      error: "unknown" as const,
    }));
    setBusy(false);
    if (result.ok) {
      toast.success(t("saved"));
      router.refresh();
    } else toast.error(t(`errors.${result.error}`));
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="profile-name">{t("name")}</Label>
        <Input
          id="profile-name"
          autoComplete="name"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-phone">{t("phone")}</Label>
        <Input
          id="profile-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="077 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div>
        <Button type="submit" disabled={busy || !name.trim()}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
