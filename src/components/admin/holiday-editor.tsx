"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { addHolidayAction, deleteHolidayAction } from "@/app/(staff)/admin/branches/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { I18nFields, type I18nValue } from "./i18n-fields";

type Holiday = {
  id: string;
  date: string;
  kind: "poya" | "public" | "festival";
  name: string;
  isAlcoholFree: boolean;
};

const KINDS = { poya: "Poya", public: "Public holiday", festival: "Festival" } as const;

export function HolidayEditor({ holidays }: { holidays: Holiday[] }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<Holiday["kind"]>("poya");
  const [name, setName] = useState<I18nValue>({ en: "", si: "", ta: "" });
  const [alcoholFree, setAlcoholFree] = useState(true);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const result = await addHolidayAction({ date, kind, name, isAlcoholFree: alcoholFree }).catch(
      () => ({ ok: false as const, error: "Something went wrong." }),
    );
    setBusy(false);
    if (!result.ok) return toast.error(result.error);
    toast.success("Holiday added.");
    setDate("");
    setName({ en: "", si: "", ta: "" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y rounded-xl border">
        {holidays.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No upcoming holidays.
          </li>
        )}
        {holidays.map((h) => (
          <li key={h.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
            <span className="w-28 font-medium tabular-nums">{h.date}</span>
            <span className="flex-1">{h.name}</span>
            <Badge variant="outline">{KINDS[h.kind]}</Badge>
            {h.isAlcoholFree && <Badge variant="highlight">No alcohol</Badge>}
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Delete ${h.name}`}
              onClick={async () => {
                if (!window.confirm(`Delete ${h.name} (${h.date})?`)) return;
                const result = await deleteHolidayAction(h.id).catch(() => ({
                  ok: false as const,
                  error: "Something went wrong.",
                }));
                if (result.ok) router.refresh();
                else toast.error(result.error);
              }}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>

      <div className="space-y-4 rounded-xl border p-4">
        <h3 className="font-semibold">Add a holiday</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="holiday-date">Date</Label>
            <Input
              id="holiday-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="holiday-kind">Kind</Label>
            <select
              id="holiday-kind"
              value={kind}
              onChange={(e) => {
                const next = e.target.value as Holiday["kind"];
                setKind(next);
                setAlcoholFree(next === "poya");
              }}
              className="h-10 w-44 rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.entries(KINDS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={alcoholFree} onCheckedChange={setAlcoholFree} /> No alcohol served
          </label>
        </div>
        <I18nFields id="holiday-name" label="Name" required value={name} onChange={setName} />
        <Button onClick={add} disabled={busy || !date || !name.en.trim()}>
          Add holiday
        </Button>
      </div>
    </div>
  );
}
