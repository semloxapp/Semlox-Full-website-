import { getDashboardData, normalizeDashboardRange } from "@/lib/dashboard";
import { authenticateAwbRequest, awbJsonResponse } from "@/lib/awb/persistence";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await authenticateAwbRequest(
    request,
    url.searchParams.get("companyId")
  );
  if (!context) {
    return awbJsonResponse(
      { ok: false, code: "NOT_AUTHENTICATED", message: "Not authenticated." },
      401
    );
  }
  try {
    const data = await getDashboardData(
      context,
      "user",
      normalizeDashboardRange(url.searchParams.get("range"))
    );
    return awbJsonResponse({ ok: true, data });
  } catch {
    return awbJsonResponse(
      {
        ok: false,
        code: "DASHBOARD_FETCH_FAILED",
        message: "Unable to load your dashboard.",
      },
      500
    );
  }
}

export const runtime = "nodejs";
