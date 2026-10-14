-- ============================================================================
-- SyncSpace Campus — Migration 0006: Collaboration & Team Discussion
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assignment_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('announcement', 'discussion')) DEFAULT 'discussion',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.assignment_messages ENABLE ROW LEVEL SECURITY;

-- Assignment members can read all messages and announcements for their group
CREATE POLICY "Assignment members can read messages"
  ON public.assignment_messages FOR SELECT
  TO authenticated
  USING (
    public.is_assignment_member(assignment_id, auth.uid()) OR public.is_admin(auth.uid())
  );

-- Assignment members can post discussions; announcements restricted to leader
CREATE POLICY "Members can post messages"
  ON public.assignment_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND public.is_assignment_member(assignment_id, auth.uid())
    AND (
      channel = 'discussion'
      OR (channel = 'announcement' AND public.is_assignment_leader(assignment_id, auth.uid()))
    )
  );
