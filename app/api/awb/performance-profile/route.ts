import {
  extractBearerTokenFromRequest,
  getUserFromAccessToken,
} from "@/lib/auth";
import { awbJsonResponse } from "@/lib/awb/persistence";
import { saveAwbPerformanceProfilePart } from "@/lib/awb/performanceProfileStore.server";

function finiteMilliseconds(value: unknown) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 30 * 60 * 1000
    ? Math.round(value * 100) / 100
    : null;
}

function safeId(value: unknown) {
  return typeof value === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(value)
    ? value
    : null;
}

function safeStages(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 20)
      .flatMap(([key, duration]) =>
        /^[a-zA-Z0-9_]{1,80}$/.test(key) &&
        finiteMilliseconds(duration) !== null
          ? [[key, finiteMilliseconds(duration)]]
          : []
      )
  );
}

export async function POST(request: Request) {
  const token = await extractBearerTokenFromRequest(request);
  const user = token ? await getUserFromAccessToken(token) : null;
  if (!user?.id) {
    return awbJsonResponse(
      { ok: false, code: "UNAUTHORIZED", message: "Authentication is required." },
      401
    );
  }

  const body = await request.json().catch(() => null);
  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
  const clientProfileId = safeId(record?.clientProfileId);
  if (!clientProfileId) {
    return awbJsonResponse(
      { ok: false, code: "INVALID_PROFILE", message: "Invalid performance profile." },
      400
    );
  }

  await saveAwbPerformanceProfilePart(clientProfileId, "browser", {
    serverProfileId: safeId(record?.serverProfileId),
    fileBytes:
      typeof record?.fileBytes === "number" &&
      Number.isFinite(record.fileBytes) &&
      record.fileBytes >= 0
        ? Math.round(record.fileBytes)
        : null,
    totalToReviewPaintMs: finiteMilliseconds(record?.totalToReviewPaintMs),
    stagesMs: safeStages(record?.stagesMs),
    serverMeasuredMs: finiteMilliseconds(record?.serverMeasuredMs),
    outsideMeasuredServerMs: finiteMilliseconds(
      record?.outsideMeasuredServerMs
    ),
  });
  return awbJsonResponse({ ok: true });
}

export const runtime = "nodejs";
