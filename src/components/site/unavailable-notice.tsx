import { PhoneCall } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Shown in place of a form when the feature isn't available (no database, or switched off). */
export function UnavailableNotice({
  title,
  body,
  linkLabel,
}: {
  title: string;
  body: string;
  linkLabel: string;
}) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-20 text-center sm:px-6">
      <PhoneCall aria-hidden className="mx-auto size-10 text-muted-foreground" />
      <h1 className="text-display-md text-primary">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      <Button asChild variant="outline">
        <Link href="/branches">{linkLabel}</Link>
      </Button>
    </div>
  );
}
