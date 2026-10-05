import { handlePayHereNotification } from "@/lib/payments/service";

/**
 * PayHere's server-to-server payment notification (notify_url). The only
 * thing that can mark a payment as paid, and only with a valid md5sig
 * (docs/SECURITY.md, "Payments"). The browser's return to the site proves
 * nothing and changes nothing.
 */

const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("application/x-www-form-urlencoded")) {
    return new Response("Unsupported media type", { status: 415 });
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 });

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 });

  const result = await handlePayHereNotification(new URLSearchParams(body));
  if (!result.ok) {
    if (result.status !== 404) {
      console.warn(`[payment] notification refused: ${result.reason}`);
    }
    return new Response(result.reason, { status: result.status });
  }
  return new Response("OK", { status: 200 });
}
