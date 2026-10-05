import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A GET form for list and report filters: the URL holds the state, so views
 * can be bookmarked and shared between admins.
 */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-soft"
    >
      {children}
      <Button type="submit" variant="outline">
        Apply
      </Button>
    </form>
  );
}

export function FilterField({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: "text" | "date" | "month";
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={`filter-${name}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`filter-${name}`}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-9 w-40"
      />
    </div>
  );
}

export function FilterSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={`filter-${name}`} className="text-xs">
        {label}
      </Label>
      <select
        id={`filter-${name}`}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-9 w-44 rounded-md border border-input bg-background px-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
