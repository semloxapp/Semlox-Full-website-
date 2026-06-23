-- Focused persistence for the AWB upload -> extract -> review -> draft flow.
-- Existing documents, extraction_results, awbs, and awb_history tables remain unchanged.

CREATE TABLE IF NOT EXISTS public.awb_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  storage_path text NULL,
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'extracting', 'review_required', 'ready_to_issue', 'draft', 'issued', 'failed')),
  extraction_mode text NOT NULL DEFAULT 'mock'
    CHECK (extraction_mode IN ('mock', 'live', 'fallback')),
  run_id text NULL,
  pages integer NULL CHECK (pages IS NULL OR pages > 0),
  processing_time_ms integer NULL CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_response jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.awb_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.awb_documents(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  value text NOT NULL DEFAULT '',
  original_value text NOT NULL DEFAULT '',
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  needs_review boolean NOT NULL DEFAULT false,
  status text NOT NULL CHECK (status IN ('valid', 'review', 'warning', 'missing')),
  color text NOT NULL CHECK (color IN ('green', 'amber', 'red', 'blue')),
  comment text NULL,
  page integer NULL CHECK (page IS NULL OR page > 0),
  source jsonb NULL,
  edited_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, key)
);

CREATE INDEX IF NOT EXISTS awb_documents_company_idx
  ON public.awb_documents (company_id);
CREATE INDEX IF NOT EXISTS awb_documents_uploaded_by_idx
  ON public.awb_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS awb_documents_status_idx
  ON public.awb_documents (company_id, status);
CREATE INDEX IF NOT EXISTS awb_documents_created_at_idx
  ON public.awb_documents (created_at DESC);
CREATE INDEX IF NOT EXISTS awb_fields_document_idx
  ON public.awb_fields (document_id);

CREATE OR REPLACE FUNCTION public.set_awb_persistence_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS awb_documents_set_updated_at ON public.awb_documents;
CREATE TRIGGER awb_documents_set_updated_at
  BEFORE UPDATE ON public.awb_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_awb_persistence_updated_at();

DROP TRIGGER IF EXISTS awb_fields_set_updated_at ON public.awb_fields;
CREATE TRIGGER awb_fields_set_updated_at
  BEFORE UPDATE ON public.awb_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_awb_persistence_updated_at();

ALTER TABLE public.awb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awb_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS awb_documents_company_select ON public.awb_documents;
CREATE POLICY awb_documents_company_select
  ON public.awb_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships membership
      WHERE membership.company_id = awb_documents.company_id
        AND membership.user_id = auth.uid()
        AND membership.accepted_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS awb_documents_company_update ON public.awb_documents;
CREATE POLICY awb_documents_company_update
  ON public.awb_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships membership
      WHERE membership.company_id = awb_documents.company_id
        AND membership.user_id = auth.uid()
        AND membership.accepted_at IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.memberships membership
      WHERE membership.company_id = awb_documents.company_id
        AND membership.user_id = auth.uid()
        AND membership.accepted_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS awb_fields_company_select ON public.awb_fields;
CREATE POLICY awb_fields_company_select
  ON public.awb_fields
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.awb_documents document
      JOIN public.memberships membership ON membership.company_id = document.company_id
      WHERE document.id = awb_fields.document_id
        AND membership.user_id = auth.uid()
        AND membership.accepted_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS awb_fields_company_update ON public.awb_fields;
CREATE POLICY awb_fields_company_update
  ON public.awb_fields
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.awb_documents document
      JOIN public.memberships membership ON membership.company_id = document.company_id
      WHERE document.id = awb_fields.document_id
        AND membership.user_id = auth.uid()
        AND membership.accepted_at IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.awb_documents document
      JOIN public.memberships membership ON membership.company_id = document.company_id
      WHERE document.id = awb_fields.document_id
        AND membership.user_id = auth.uid()
        AND membership.accepted_at IS NOT NULL
    )
  );

-- No authenticated INSERT or DELETE policy is granted.
-- Server APIs use the service role after verifying the authenticated membership.
