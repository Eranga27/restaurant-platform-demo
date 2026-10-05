"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { cancelReservationAction } from "@/app/[locale]/(site)/reservations/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CancelBooking({
  token,
  when,
  partySize,
}: {
  token: string;
  when: string;
  partySize: number;
}) {
  const t = useTranslations("Reservation");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function cancel() {
    setBusy(true);
    const result = await cancelReservationAction(token).catch(() => ({ ok: false }));
    setBusy(false);
    setOpen(false);
    if (result.ok) toast.success(t("cancelled"));
    else toast.error(t("cancelFailed"));
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          {t("cancel")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cancelTitle")}</DialogTitle>
          <DialogDescription>{t("cancelBody", { count: partySize, when })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("keep")}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={cancel}>
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
