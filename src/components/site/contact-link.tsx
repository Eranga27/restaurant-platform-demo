"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { publicEnv } from "@/lib/public-env";
import { whatsappNumber } from "@/lib/phone";

type ContactLinkProps = {
  kind: "tel" | "whatsapp" | "email";
  /** E.164 number or email address. */
  value: string;
  className?: string;
  children: ReactNode;
};

/**
 * Call, WhatsApp and email links. In demo mode they render as plain text: the
 * demo numbers are made up, and a real person might own one.
 */
export function ContactLink({ kind, value, className, children }: ContactLinkProps) {
  const t = useTranslations("Demo");

  if (publicEnv.demoMode) {
    return (
      <span className={className} title={t("contactDisabled")}>
        {children}
      </span>
    );
  }

  const href =
    kind === "tel"
      ? `tel:${value}`
      : kind === "whatsapp"
        ? `https://wa.me/${whatsappNumber(value)}`
        : `mailto:${value}`;

  return (
    <a
      href={href}
      className={className}
      {...(kind === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
