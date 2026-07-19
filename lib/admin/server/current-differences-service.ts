import "server-only";
import { buildAdminCurrentDifferenceDetail, buildAdminCurrentDifferences } from "@/lib/admin/current-differences";
import { isFieldDifferentFromAiOutput } from "@/lib/admin/metrics";
import { getAdminCurrentDifferenceSourceRows } from "./repository";
import type { AdminCurrentDifferencesQuery } from "./validation";

export async function getAdminCurrentDifferences(query: AdminCurrentDifferencesQuery) { const { fields, documents } = await getAdminCurrentDifferenceSourceRows(query); return buildAdminCurrentDifferences(fields, documents, query); }
export async function getAdminCurrentDifferenceDetail(fieldId: string) { const { fields, documents } = await getAdminCurrentDifferenceSourceRows({ dateFrom: null, dateTo: null, companyId: null, userId: null }); const field = fields.find((item) => item.id === fieldId); if (!field || !isFieldDifferentFromAiOutput(field.value, field.original_value)) return null; const document = documents.find((item) => item.id === field.document_id); if (!document) return null; return buildAdminCurrentDifferenceDetail(field, document, fields.filter((item) => item.document_id === field.document_id)); }
