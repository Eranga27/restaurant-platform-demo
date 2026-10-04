"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string };

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
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "rounded-md text-foreground/80 transition-colors hover:text-primary aria-[current=page]:font-semibold aria-[current=page]:text-primary",
                linkClassName,
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
