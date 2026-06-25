export async function POST() {
  // Clear the semlox_session cookie
  const headers = new Headers();
  const cookieParts = ["semlox_session=", "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (process.env.NODE_ENV === "production") cookieParts.push("Secure");
  headers.set("Set-Cookie", cookieParts.join("; "));
  return new Response(JSON.stringify({ ok: true }), { headers, status: 200 });
}

export const runtime = "edge";
