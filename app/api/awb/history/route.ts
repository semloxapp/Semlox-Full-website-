import {
  authenticateAwbRequest,
  awbJsonResponse,
  getAwbHistory,
} from "@/lib/awb/persistence";

const HISTORY_STATUSES = new Set([
  "uploaded",
  "extracting",
  "review_required",
  "ready_to_issue",
  "draft",
  "issued",
  "failed",
]);
const HISTORY_ACTIONS = new Set([
  "Initial Extraction",
  "Draft Saved",
  "Issued AWB",
  "Failed",
]);

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return null;
  const parsed = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "company" ? "company" : "my";
  const companyId = url.searchParams.get("companyId");
  const context = await authenticateAwbRequest(request, companyId);
  if (!context) {
    return awbJsonResponse(
      { ok: false, code: "NOT_AUTHENTICATED", message: "Not authenticated." },
      401
    );
  }
  if (scope === "company" && !["owner", "admin"].includes(context.role)) {
    return awbJsonResponse(
      {
        ok: false,
        code: "COMPANY_HISTORY_FORBIDDEN",
        message: "Your role cannot view company history.",
      },
      403
    );
  }

  try {
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const status = url.searchParams.get("status") || "";
    const action = url.searchParams.get("action") || "";
    const range = url.searchParams.get("range") || "all";
    let from = parseDate(url.searchParams.get("from"));
    let to = parseDate(url.searchParams.get("to"), true);
    const now = new Date();
    if (!from && !to && range !== "all") {
      to = now;
      if (range === "today") from = startOfDay(now);
      if (range === "7d") {
        from = startOfDay(now);
        from.setDate(from.getDate() - 6);
      }
      if (range === "30d") {
        from = startOfDay(now);
        from.setDate(from.getDate() - 29);
      }
    }

    const allDocuments = await getAwbHistory(context, scope);
    const documents = allDocuments.filter((document) => {
      const createdAt = new Date(document.createdAt);
      if (from && createdAt < from) return false;
      if (to && createdAt > to) return false;
      if (HISTORY_STATUSES.has(status) && document.status !== status) return false;
      if (HISTORY_ACTIONS.has(action) && document.action !== action) return false;
      if (search) {
        const haystack = [
          document.awbNumber,
          document.fileName,
          document.processedBy.name,
          document.processedBy.email,
          document.status,
          document.action,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
    const stats = {
      totalDocuments: documents.length,
      successful: documents.filter((document) =>
        ["issued", "ready_to_issue", "review_required"].includes(document.status)
      ).length,
      failed: documents.filter((document) => document.status === "failed").length,
      drafts: documents.filter((document) => document.status === "draft").length,
      issued: documents.filter((document) => document.status === "issued").length,
    };

    return awbJsonResponse({
      ok: true,
      data: {
        scope,
        canViewCompanyHistory: ["owner", "admin"].includes(context.role),
        role: context.role,
        stats,
        documents,
      },
    });
  } catch {
    return awbJsonResponse(
      { ok: false, code: "HISTORY_FETCH_FAILED", message: "Unable to load AWB history." },
      500
    );
  }
}

export const runtime = "nodejs";
