"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { setAcceptingOrdersAction } from "@/app/(staff)/dashboard/actions";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** Pauses or resumes online orders for the branch. */
export function AcceptingToggle({ branchId, accepting }: { branchId: string; accepting: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(accepting);
  const [busy, setBusy] = useState(false);

  async function change(next: boolean) {
    setBusy(true);
    setValue(next);
    const result = await setAcceptingOrdersAction({ branchId, accepting: next }).catch(() => ({
      ok: false as const,
    }));
    setBusy(false);
    if (!result.ok) {
      setValue(!next);
      toast.error("Couldn't change online ordering. Please try again.");
      return;
    }
    toast.success(next ? "Online orders are on." : "Online orders are paused.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Switch id="accepting" checked={value} disabled={busy} onCheckedChange={change} />
      <Label htmlFor="accepting" className="text-sm">
        {value ? "Taking online orders" : "Online orders paused"}
      </Label>
    </div>
  );
}
