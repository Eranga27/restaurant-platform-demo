"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { markRefundedAction } from "@/app/(staff)/admin/payments/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Records that a refund was made in PayHere's portal. */
export function RefundButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const result = await markRefundedAction({ paymentId, note }).catch(() => ({
      ok: false as const,
      error: "Something went wrong.",
    }));
    setBusy(false);
    if (!result.ok) return toast.error(result.error);
    toast.success("Marked as refunded.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Mark refunded
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark this payment as refunded?</DialogTitle>
          <DialogDescription>
            Do this after making the refund in PayHere. It can&apos;t be undone here.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`refund-note-${paymentId}`}>Note (optional)</Label>
          <Input
            id={`refund-note-${paymentId}`}
            value={note}
            maxLength={300}
            placeholder="PayHere refund reference"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Not yet
          </Button>
          <Button onClick={confirm} disabled={busy}>
            Mark refunded
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
