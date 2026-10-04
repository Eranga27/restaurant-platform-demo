import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Who is signed in, for the header. Session cookies are HttpOnly, so the
 * browser can't read them itself. Also refreshes an expiring session.
 */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(
    user ? { signedIn: true, name: user.name, email: user.email } : { signedIn: false },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
