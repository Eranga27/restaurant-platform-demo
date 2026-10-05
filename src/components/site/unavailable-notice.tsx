import { PhoneCall } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * Shown in place of a form when the feature isn't available (no database, or
 * switched off). `embedded` when the page already has its own h1.
 */
export function UnavailableNotice({
  title,
  body,
  linkLabel,
  embedded = false,
}: {
  title: string;
  body: string;
  linkLabel: string;
  embedded?: boolean;
}) {
  const Heading = embedded ? "h2" : "h1";
  return (
    <div
      className={
        embedded
          ? "space-y-4 rounded-2xl border border-dashed p-8 text-center"
          : "mx-auto w-full max-w-xl space-y-4 px-4 py-20 text-center sm:px-6"
      }
    >
      <PhoneCall aria-hidden className="mx-auto size-10 text-muted-foreground" />
      <Heading className="text-display-md text-primary">{title}</Heading>
      <p className="text-muted-foreground">{body}</p>
      <Button asChild variant="outline">
        <Link href="/branches">{linkLabel}</Link>
      </Button>
    </div>
  );
}
