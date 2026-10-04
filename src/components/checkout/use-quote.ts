"use client";

import { useEffect, useRef, useState } from "react";

import { quoteAction, type QuoteView } from "@/app/[locale]/(site)/checkout/actions";
import type { QuoteRequest } from "@/lib/orders/schema";

/**
 * Re-prices the order on the server whenever the request changes, debounced.
 * Prices on screen always come from the server, never the cart snapshot.
 */
export function useQuote(request: QuoteRequest | null, locale: string) {
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);
  const key = request ? JSON.stringify(request) : null;

  useEffect(() => {
    if (!key) return;
    const id = ++latest.current;
    const timer = setTimeout(() => {
      setLoading(true);
      quoteAction(JSON.parse(key) as QuoteRequest, locale)
        .then((response) => {
          if (id !== latest.current) return; // a newer request superseded this one
          setFailed(!response.ok);
          if (response.ok) setQuote(response.quote);
        })
        .catch(() => id === latest.current && setFailed(true))
        .finally(() => id === latest.current && setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [key, locale]);

  return { quote, setQuote, loading, failed };
}
