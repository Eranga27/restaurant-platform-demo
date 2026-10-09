"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CURTAIN } from "@/lib/transitions";

/** `className` goes on the item's list entry, e.g. to hide it where the header has a button for it. */
export type NavItem = { href: string; label: string; className?: string };

export function NavLinks({
  items,
  className,
  linkClassName,
  onNavigate,
}: {
  items: NavItem[];
  className?: string;
  linkClassName?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <ul className={className}>
      {items.map((item) => {
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href} className={item.className}>
            <Link
              href={item.href}
              transitionTypes={CURTAIN}
              aria-current={current ? "page" : undefined}
              onClick={onNavigate}
              className={cn("rounded-md transition-[color,opacity]", linkClassName)}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
