"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { publicEnv } from "@/lib/public-env";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Cloudflare Turnstile, the free CAPTCHA alternative. Rendered explicitly so
 * the script can carry the page's CSP nonce. Posts its token in a hidden
 * `cf-turnstile-response` field and reports it through `onToken`.
 */
export function Turnstile({
  nonce,
  action,
  onToken,
  resetKey,
}: {
  nonce?: string;
  action: string;
  onToken?: (token: string | null) => void;
  /** Change to get a fresh token (tokens are single-use). */
  resetKey?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callback.current = onToken;
  });

  useEffect(() => {
    if (!ready || !container.current || !window.turnstile) return;
    const id = window.turnstile.render(container.current, {
      sitekey: publicEnv.turnstileSiteKey,
      action,
      size: "flexible",
      theme: "light",
      callback: (token: string) => callback.current?.(token),
      "expired-callback": () => callback.current?.(null),
      "error-callback": () => callback.current?.(null),
    });
    return () => window.turnstile?.remove(id);
  }, [ready, action, resetKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        nonce={nonce}
        onReady={() => setReady(true)}
      />
      <div ref={container} className="min-h-[65px]" />
    </>
  );
}
