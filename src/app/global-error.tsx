"use client";

import "./globals.css";

/**
 * Last resort when a root layout itself fails, so brand settings and
 * translations may be unavailable: plain English, the default palette.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
        <title>Something went wrong</title>
        <main className="max-w-md space-y-5 text-center">
          <h1 className="text-display-md text-primary">Something went wrong</h1>
          <p className="text-muted-foreground">
            Sorry, this page didn&apos;t load. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground"
          >
            Try again
          </button>
          {error.digest && (
            <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
