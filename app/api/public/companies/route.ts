import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase";

export async function GET() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(JSON.stringify({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/companies?select=id,name`, {
      method: "GET",
      headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` },
    });
    if (!resp.ok) {
      if (process.env.NODE_ENV !== "production") console.log("[public-companies] fetch failed", resp.status);
      return new Response(JSON.stringify({ ok: false, code: "DATA_FETCH_FAILED", message: "Failed to load companies" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const data = await resp.json().catch(() => []);
    const out = Array.isArray(data) ? data.map((c: any) => ({ id: c.id, name: c.name })) : [];
    return new Response(JSON.stringify({ ok: true, data: out }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.log("[public-companies] unexpected error", e);
    return new Response(JSON.stringify({ ok: false, code: "SERVER_ERROR", message: "Failed to load companies" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export const runtime = "edge";
