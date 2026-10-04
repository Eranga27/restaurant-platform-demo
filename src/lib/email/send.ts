import "server-only";

import { render, toPlainText } from "@react-email/components";
import type { ReactElement } from "react";
import { Resend } from "resend";

import { env } from "@/lib/env";

/**
 * Sends an email with Resend, or prints it to the server log when no API key
 * is set (docs/DECISIONS.md D9, D10). Never throws: a failed email must not
 * fail the order that triggered it.
 */
export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<{ sent: boolean }> {
  try {
    const html = await render(react);
    const text = toPlainText(html);
    const { RESEND_API_KEY: apiKey, EMAIL_FROM: from } = env();

    if (!apiKey) {
      console.info(
        `[email] (not sent: RESEND_API_KEY unset)\nTo: ${to}\nSubject: ${subject}\n\n${text}`,
      );
      return { sent: false };
    }

    const { error } = await new Resend(apiKey).emails.send({
      from: from ?? "Kithul & Co. <onboarding@resend.dev>",
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[email] Resend rejected the message", error.name, error.message);
      return { sent: false };
    }
    return { sent: true };
  } catch (error) {
    console.error("[email] failed", error);
    return { sent: false };
  }
}
