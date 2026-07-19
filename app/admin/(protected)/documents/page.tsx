import { DocumentAuditClient } from "@/components/admin/documents/DocumentAuditClient";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ document?: string | string[] }> }) {
  const params = await searchParams;
  const requestedDocument = Array.isArray(params.document) ? params.document[0] : params.document;
  const initialDocumentId = requestedDocument && UUID_PATTERN.test(requestedDocument) ? requestedDocument : null;
  return <DocumentAuditClient initialDocumentId={initialDocumentId}/>;
}
