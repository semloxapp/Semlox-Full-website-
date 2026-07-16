import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    // Revokes the refresh token server-side (previously this route only
    // cleared the cookie locally; a captured token would have stayed valid
    // at Supabase indefinitely after "signing out").
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    // Even if revocation fails (e.g. Supabase unreachable), still clear the
    // local cookie state and return ok so the client can proceed to /login.
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

export const runtime = "nodejs";
