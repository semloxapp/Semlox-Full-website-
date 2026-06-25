export async function fetchMemberships() {
  try {
    // Do not send Authorization header here; server will use httpOnly cookie when present.
    const resp = await fetch("/api/auth/memberships", { credentials: "include" });
    if (resp.status === 401 || resp.status === 403) {
      return { ok: false, status: resp.status };
    }
    if (!resp.ok) return { ok: false, status: resp.status };
    const j = await resp.json().catch(() => ({}));
    if (j?.ok === false) return { ok: false, status: resp.status };
    const memberships = j?.memberships || [];
    return { ok: true, status: resp.status, memberships };
  } catch (e) {
    return { ok: false, status: 500 };
  }
}

export default { fetchMemberships };
