import {
  eachDayOfInterval,
  format,
  startOfDay,
  subDays,
} from "date-fns";
import { supabaseServiceRoleKey, supabaseUrl } from "./supabase";
import type {
  AwbAccessContext,
  DocumentRow,
  FieldRow,
} from "./awb/persistence";

type DashboardRange = "7d" | "30d" | "90d";
type DashboardScope = "user" | "company";

type EventRow = {
  id: string;
  document_id: string | null;
  user_id: string;
  event_type: string;
  event_title: string;
  event_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function headers() {
  if (!supabaseServiceRoleKey) throw new Error("Dashboard service unavailable");
  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
  };
}

async function rows<T>(path: string): Promise<T[]> {
  if (!supabaseUrl) throw new Error("Dashboard service unavailable");
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: headers(),
  });
  const data = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(data)) throw new Error("Dashboard query failed");
  return data as T[];
}

async function optionalRows<T>(path: string): Promise<T[]> {
  try {
    return await rows<T>(path);
  } catch {
    return [];
  }
}

function rangeDays(range: DashboardRange) {
  return range === "7d" ? 7 : range === "90d" ? 90 : 30;
}

export async function getDashboardData(
  context: AwbAccessContext,
  scope: DashboardScope,
  range: DashboardRange
) {
  if (scope === "company" && !["owner", "admin"].includes(context.role)) {
    throw new Error("COMPANY_DASHBOARD_FORBIDDEN");
  }

  const days = rangeDays(range);
  const fromDate = startOfDay(subDays(new Date(), days - 1));
  const documentFilters = [
    `company_id=eq.${context.companyId}`,
    scope === "user" ? `uploaded_by=eq.${context.userId}` : "",
    `created_at=gte.${fromDate.toISOString()}`,
    "select=*",
    "order=created_at.asc",
  ].filter(Boolean);
  const documents = await rows<DocumentRow>(
    `awb_documents?${documentFilters.join("&")}`
  );
  const documentIds = documents.map((document) => document.id);
  const fields = documentIds.length
    ? await rows<FieldRow>(
        `awb_fields?document_id=in.(${documentIds.join(",")})&select=*`
      )
    : [];
  const events = await optionalRows<EventRow>(
    `awb_events?company_id=eq.${context.companyId}` +
      `${scope === "user" ? `&user_id=eq.${context.userId}` : ""}` +
      `&created_at=gte.${fromDate.toISOString()}&select=*&order=created_at.desc&limit=60`
  );

  const fieldsByDocument = new Map<string, FieldRow[]>();
  for (const field of fields) {
    const current = fieldsByDocument.get(field.document_id) || [];
    current.push(field);
    fieldsByDocument.set(field.document_id, current);
  }

  const userIds = Array.from(new Set(documents.map((document) => document.uploaded_by)));
  const [profiles, users, memberships] = await Promise.all([
    userIds.length
      ? optionalRows<{ id: string; full_name: string | null }>(
          `profiles?id=in.(${userIds.join(",")})&select=id,full_name`
        )
      : [],
    userIds.length
      ? optionalRows<{ id: string; email: string | null }>(
          `users?id=in.(${userIds.join(",")})&select=id,email`
        )
      : [],
    scope === "company"
      ? optionalRows<{ user_id: string; role: string }>(
          `memberships?company_id=eq.${context.companyId}&accepted_at=not.is.null&select=user_id,role`
        )
      : [],
  ]);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile.full_name || ""]));
  const emailById = new Map(users.map((user) => [user.id, user.email || ""]));
  const roleById = new Map(memberships.map((membership) => [membership.user_id, membership.role]));
  const userName = (userId: string) =>
    profileById.get(userId) || emailById.get(userId) || "Unknown user";
  const awbNumber = (documentId: string, fallback: string) =>
    fieldsByDocument.get(documentId)?.find((field) => field.key === "awb_number")
      ?.value || fallback;
  const fieldSummary = (documentId: string) => {
    const values = fieldsByDocument.get(documentId) || [];
    const corrected = values.filter(
      (field) => String(field.value || "") !== String(field.original_value || "")
    ).length;
    return {
      total: values.length,
      captured: values.filter((field) => String(field.value || "").trim()).length,
      warnings: values.filter((field) =>
        ["warning", "review", "missing"].includes(field.status)
      ).length,
      corrected,
    };
  };

  const totalFields = fields.length;
  const correctedFields = fields.filter(
    (field) => String(field.value || "") !== String(field.original_value || "")
  ).length;
  const avgConfidence = totalFields
    ? fields.reduce((sum, field) => sum + (Number(field.confidence) || 0), 0) /
      totalFields
    : 0;
  const processingValues = documents
    .map((document) => Number(document.processing_time_ms) || 0)
    .filter((value) => value > 0);
  const avgProcessingTimeMs = processingValues.length
    ? Math.round(
        processingValues.reduce((sum, value) => sum + value, 0) /
          processingValues.length
      )
    : 0;
  const today = startOfDay(new Date());
  const statusCount = (status: DocumentRow["status"]) =>
    documents.filter((document) => document.status === status).length;
  const needsReview = documents.filter((document) =>
    ["review_required", "draft"].includes(document.status)
  ).length;

  const trend = eachDayOfInterval({
    start: fromDate,
    end: startOfDay(new Date()),
  }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const daily = documents.filter(
      (document) => format(new Date(document.created_at), "yyyy-MM-dd") === key
    );
    return {
      date: key,
      label: format(day, days > 30 ? "MMM d" : "MMM d"),
      uploaded: daily.length,
      draft: daily.filter((document) => document.status === "draft").length,
      issued: daily.filter((document) => document.status === "issued").length,
      failed: daily.filter((document) => document.status === "failed").length,
    };
  });

  const statusSplit = [
    { name: "Issued", value: statusCount("issued"), color: "#10b981" },
    { name: "Draft", value: statusCount("draft"), color: "#f59e0b" },
    {
      name: "Needs Review",
      value: statusCount("review_required"),
      color: "#f97316",
    },
    { name: "Ready", value: statusCount("ready_to_issue"), color: "#06b6d4" },
    { name: "Failed", value: statusCount("failed"), color: "#ef4444" },
  ].filter((item) => item.value > 0);

  const activeDocuments = documents
    .filter((document) =>
      ["review_required", "draft", "ready_to_issue", "failed"].includes(
        document.status
      )
    )
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    )
    .slice(0, 12)
    .map((document) => ({
      documentId: document.id,
      awbNumber: awbNumber(document.id, document.file_name),
      fileName: document.file_name,
      processedBy: userName(document.uploaded_by),
      status: document.status,
      fields: fieldSummary(document.id),
      updatedAt: document.updated_at,
    }));

  const recentActivity = events.slice(0, 12).map((event) => ({
    id: event.id,
    documentId: event.document_id,
    type: event.event_type,
    title: event.event_title,
    message: event.event_message,
    createdAt: event.created_at,
    user: userName(event.user_id),
  }));

  const baseStats = {
    needsReview,
    drafts: statusCount("draft"),
    issued: statusCount("issued"),
    failed: statusCount("failed"),
    avgProcessingTimeMs,
    avgConfidence,
    fieldsCorrected: correctedFields,
    correctionRate: totalFields ? correctedFields / totalFields : 0,
  };

  if (scope === "user") {
    return {
      scope,
      range,
      canViewCompanyDashboard: ["owner", "admin"].includes(context.role),
      role: context.role,
      stats: {
        myAwbsToday: documents.filter(
          (document) => new Date(document.created_at) >= today
        ).length,
        ...baseStats,
      },
      trend,
      statusSplit,
      pendingWork: activeDocuments,
      recentActivity,
    };
  }

  const teamActivity = userIds
    .map((userId) => {
      const userDocuments = documents.filter(
        (document) => document.uploaded_by === userId
      );
      return {
        userId,
        name: userName(userId),
        email: emailById.get(userId) || "",
        role: roleById.get(userId) || "user",
        uploaded: userDocuments.length,
        drafts: userDocuments.filter((document) => document.status === "draft")
          .length,
        issued: userDocuments.filter((document) => document.status === "issued")
          .length,
        failed: userDocuments.filter((document) => document.status === "failed")
          .length,
        fieldsCorrected: userDocuments.reduce(
          (sum, document) => sum + fieldSummary(document.id).corrected,
          0
        ),
        lastActive:
          userDocuments
            .map((document) => document.updated_at)
            .sort()
            .at(-1) || null,
      };
    })
    .sort((left, right) => right.uploaded - left.uploaded);

  const exceptions = activeDocuments
    .filter(
      (document) =>
        document.status === "failed" ||
        document.status === "review_required" ||
        document.fields.warnings >= 3
    )
    .slice(0, 10);

  return {
    scope,
    range,
    role: context.role,
    stats: { companyAwbs: documents.length, ...baseStats },
    trend,
    statusSplit,
    teamActivity,
    activeDocuments,
    exceptions,
    recentActivity,
  };
}

export function normalizeDashboardRange(value: string | null): DashboardRange {
  return value === "7d" || value === "90d" ? value : "30d";
}
