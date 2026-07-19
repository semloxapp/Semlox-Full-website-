import "server-only";
import { buildAdminPerformance, buildAdminPerformanceDocumentList } from "@/lib/admin/performance";
import { getAdminFieldsForDocuments, getAdminPerformanceDocumentPage, getAdminPerformanceSourceRows } from "./repository";
import type { AdminPerformanceDocumentQuery } from "./validation";
import type { AdminAnalyticsScope } from "@/lib/admin/types";

export async function getAdminPerformance(scope: AdminAnalyticsScope) { const { documents, fields } = await getAdminPerformanceSourceRows(scope); return buildAdminPerformance(documents, fields); }
export async function getAdminPerformanceDocuments(query: AdminPerformanceDocumentQuery) { const { documents, totalItems } = await getAdminPerformanceDocumentPage(query); const fields = await getAdminFieldsForDocuments(documents.map((document) => document.id)); return buildAdminPerformanceDocumentList(documents, fields, totalItems, query); }
