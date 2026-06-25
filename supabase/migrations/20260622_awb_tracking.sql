-- Production tracking for AWB activity and human corrections.
-- Existing awb_documents and awb_fields structures remain unchanged.

CREATE TABLE IF NOT EXISTS public.awb_field_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.awb_documents(id) ON DELETE CASCADE,
  field_id uuid NULL REFERENCES public.awb_fields(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  field_label text NOT NULL,
  old_value text NULL,
  new_value text NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  ai_original_value text NULL,
  ai_confidence numeric NULL,
  ai_status text NULL,
  change_source text NOT NULL DEFAULT 'user_edit'
    CHECK (change_source IN ('user_edit', 'draft_save', 'issue_save', 'system'))
);

CREATE TABLE IF NOT EXISTS public.awb_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NULL REFERENCES public.awb_documents(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  event_type text NOT NULL
    CHECK (event_type IN (
      'uploaded',
      'extraction_started',
      'extraction_completed',
      'extraction_failed',
      'field_updated',
      'draft_saved',
      'issued',
      'exported_pdf',
      'downloaded'
    )),
  event_title text NOT NULL,
  event_message text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS awb_field_revisions_company_idx
  ON public.awb_field_revisions (company_id);
CREATE INDEX IF NOT EXISTS awb_field_revisions_document_idx
  ON public.awb_field_revisions (document_id);
CREATE INDEX IF NOT EXISTS awb_field_revisions_field_key_idx
  ON public.awb_field_revisions (field_key);
CREATE INDEX IF NOT EXISTS awb_field_revisions_changed_by_idx
  ON public.awb_field_revisions (changed_by);
CREATE INDEX IF NOT EXISTS awb_field_revisions_changed_at_idx
  ON public.awb_field_revisions (changed_at DESC);

CREATE INDEX IF NOT EXISTS awb_events_company_idx
  ON public.awb_events (company_id);
CREATE INDEX IF NOT EXISTS awb_events_user_idx
  ON public.awb_events (user_id);
CREATE INDEX IF NOT EXISTS awb_events_document_idx
  ON public.awb_events (document_id);
CREATE INDEX IF NOT EXISTS awb_events_type_idx
  ON public.awb_events (event_type);
CREATE INDEX IF NOT EXISTS awb_events_created_at_idx
  ON public.awb_events (created_at DESC);

ALTER TABLE public.awb_field_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awb_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS awb_field_revisions_company_select ON public.awb_field_revisions;
CREATE POLICY awb_field_revisions_company_select
  ON public.awb_field_revisions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships membership
      WHERE membership.company_id = awb_field_revisions.company_id
        AND membership.user_id = auth.uid()
        AND membership.accepted_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS awb_events_company_select ON public.awb_events;
CREATE POLICY awb_events_company_select
  ON public.awb_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships membership
      WHERE membership.company_id = awb_events.company_id
        AND membership.user_id = auth.uid()
        AND membership.accepted_at IS NOT NULL
    )
  );

-- No authenticated INSERT, UPDATE, or DELETE policies are granted.
-- Membership-validated server APIs write with the service role.
