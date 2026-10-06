import Image from "next/image";

import type { Brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function Logo({ brand, className }: { brand: Brand; className?: string }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2.5 rounded-lg", className)}>
      <Image src={brand.logo.mark} alt="" width={36} height={36} priority />
      {brand.logo.wordmark ? (
        <Image src={brand.logo.wordmark} alt={brand.name} width={140} height={32} priority />
      ) : (
        <span className="font-display text-2xl leading-none tracking-tight">{brand.name}</span>
      )}
    </Link>
  );
}
