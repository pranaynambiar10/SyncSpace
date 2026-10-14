-- ============================================================================
-- SyncSpace Campus — Migration 0005: Weighted Progress Engine & Storage Security
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Database View: assignment_progress_view
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.assignment_progress_view AS
SELECT
  a.id AS assignment_id,
  a.title AS assignment_title,
  a.status AS assignment_status,
  COALESCE(SUM(t.weight), 0) AS total_weight,
  COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.weight ELSE 0 END), 0) AS completed_weight,
  CASE
    WHEN COALESCE(SUM(t.weight), 0) = 0 THEN NULL -- Eliminate divide-by-zero guard
    ELSE ROUND((COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.weight ELSE 0 END), 0)::numeric / SUM(t.weight)::numeric) * 100, 1)
  END AS progress_pct,
  COUNT(t.id) AS tasks_total,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS tasks_completed,
  COUNT(CASE WHEN t.status = 'under_review' THEN 1 END) AS tasks_under_review,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) AS tasks_in_progress,
  COUNT(CASE WHEN t.status = 'todo' THEN 1 END) AS tasks_todo,
  COUNT(CASE WHEN t.status = 'changes_requested' THEN 1 END) AS tasks_changes_requested
FROM public.assignments a
LEFT JOIN public.tasks t ON a.id = t.assignment_id
GROUP BY a.id, a.title, a.status;

-- ----------------------------------------------------------------------------
-- 2. Progress Engine RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_assignment_progress(p_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_rec record;
BEGIN
  -- Membership check
  IF NOT public.is_assignment_member(p_assignment_id, auth.uid()) AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: You are not an enrolled member of this assignment.';
  END IF;

  SELECT * INTO v_rec
  FROM public.assignment_progress_view
  WHERE assignment_id = p_assignment_id;

  RETURN jsonb_build_object(
    'assignment_id', p_assignment_id,
    'total_weight', v_rec.total_weight,
    'completed_weight', v_rec.completed_weight,
    'progress_pct', v_rec.progress_pct,
    'tasks_total', v_rec.tasks_total,
    'tasks_completed', v_rec.tasks_completed,
    'tasks_under_review', v_rec.tasks_under_review,
    'tasks_in_progress', v_rec.tasks_in_progress,
    'tasks_todo', v_rec.tasks_todo,
    'tasks_changes_requested', v_rec.tasks_changes_requested
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Storage Policies: assignment-files Bucket
-- Path Pattern: assignments/{assignment_id}/{task_id}/{filename}
-- ----------------------------------------------------------------------------
-- Note: Create the 'assignment-files' bucket in Supabase dashboard (set to private).
-- These policies enforce that non-members receive 403 Forbidden on deliverables.

DO $$
BEGIN
  -- Insert bucket if storage schema exists and bucket not present
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('assignment-files', 'assignment-files', false)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public)
    VALUES ('academic-notes', 'academic-notes', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Policy for assignment-files: Members only
CREATE POLICY "Assignment members can access deliverable files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'assignment-files'
    AND (
      public.is_assignment_member(
        (split_part(name, '/', 2))::uuid,
        auth.uid()
      )
      OR public.is_admin(auth.uid())
    )
  );

CREATE POLICY "Assignment members can upload deliverable files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assignment-files'
    AND public.is_assignment_member(
      (split_part(name, '/', 2))::uuid,
      auth.uid()
    )
  );
