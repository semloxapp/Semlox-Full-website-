-- Per-user read/archive state for shared notification rows.
-- Existing public.notifications columns and data remain unchanged.

CREATE TABLE IF NOT EXISTS public.notification_receipts (
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NULL,
  archived_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS notification_receipts_user_idx
  ON public.notification_receipts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notification_receipts_unread_idx
  ON public.notification_receipts (user_id, notification_id)
  WHERE read_at IS NULL AND archived_at IS NULL;

ALTER TABLE public.notification_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_receipts_self_select ON public.notification_receipts;
CREATE POLICY notification_receipts_self_select
  ON public.notification_receipts
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notification_receipts_self_update ON public.notification_receipts;
CREATE POLICY notification_receipts_self_update
  ON public.notification_receipts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No INSERT or DELETE policy is granted to authenticated clients.
-- Server notification APIs use the service role and validate visibility first.
