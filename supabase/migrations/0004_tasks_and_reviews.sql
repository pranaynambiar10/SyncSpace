-- ============================================================================
-- SyncSpace Campus — Migration 0004: Tasks, Deliverables & Review Loop
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tasks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  weight int NOT NULL CHECK (weight > 0) DEFAULT 10,
  deliverable_type text NOT NULL CHECK (deliverable_type IN ('document', 'presentation', 'written_response', 'url', 'checklist', 'other')) DEFAULT 'document',
  acceptance_criteria text,
  status text NOT NULL CHECK (status IN ('todo', 'in_progress', 'submitted', 'under_review', 'completed', 'changes_requested')) DEFAULT 'todo',
  deadline timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. Task Submissions (Immutable Versioned Deliverables)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id),
  version_number int NOT NULL DEFAULT 1,
  file_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  written_response text,
  url text,
  is_current boolean DEFAULT true,
  review_status text NOT NULL CHECK (review_status IN ('pending', 'approved', 'changes_requested')) DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  review_comment text,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(task_id, version_number)
);

-- ----------------------------------------------------------------------------
-- 3. Functions: Submit Deliverable & Leader Review Enforcement
-- ----------------------------------------------------------------------------

-- Submit a new deliverable version
CREATE OR REPLACE FUNCTION public.submit_task_deliverable(
  p_task_id uuid,
  p_file_path text DEFAULT null,
  p_file_name text DEFAULT null,
  p_file_size bigint DEFAULT null,
  p_mime_type text DEFAULT null,
  p_written_response text DEFAULT null,
  p_url text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task record;
  v_next_version int;
  v_submission_id uuid;
BEGIN
  -- Verify task exists and user is assignment member
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found.';
  END IF;

  IF NOT public.is_assignment_member(v_task.assignment_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: You are not a member of this assignment.';
  END IF;

  -- Determine next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM public.task_submissions
  WHERE task_id = p_task_id;

  -- Archive prior current flags
  UPDATE public.task_submissions
  SET is_current = false
  WHERE task_id = p_task_id;

  -- Insert new submission
  INSERT INTO public.task_submissions (
    task_id,
    submitted_by,
    version_number,
    file_path,
    file_name,
    file_size,
    mime_type,
    written_response,
    url,
    is_current,
    review_status
  ) VALUES (
    p_task_id,
    auth.uid(),
    v_next_version,
    p_file_path,
    p_file_name,
    p_file_size,
    p_mime_type,
    p_written_response,
    p_url,
    true,
    'pending'
  )
  RETURNING id INTO v_submission_id;

  -- Advance task status to 'under_review'
  UPDATE public.tasks
  SET
    status = 'under_review',
    updated_at = now()
  WHERE id = p_task_id;

  RETURN jsonb_build_object(
    'submission_id', v_submission_id,
    'version_number', v_next_version
  );
END;
$$;

-- Leader Review RPC: strictly enforces submitter != reviewer
CREATE OR REPLACE FUNCTION public.review_task_submission(
  p_submission_id uuid,
  p_decision text, -- 'approved' or 'changes_requested'
  p_comment text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission record;
  v_task record;
  v_is_leader boolean;
BEGIN
  IF p_decision NOT IN ('approved', 'changes_requested') THEN
    RAISE EXCEPTION 'Invalid review decision. Must be approved or changes_requested.';
  END IF;

  SELECT * INTO v_submission FROM public.task_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found.';
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = v_submission.task_id;

  -- Check leadership / reviewer authorization
  v_is_leader := public.is_assignment_leader(v_task.assignment_id, auth.uid());
  IF NOT v_is_leader AND v_task.reviewer_id <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: Only project leaders or designated reviewers can evaluate deliverables.';
  END IF;

  -- Strict Integrity Rule: Submitter cannot review own deliverable
  IF v_submission.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'Integrity Policy Violation: You cannot review or approve your own submission.';
  END IF;

  -- Update submission review columns
  UPDATE public.task_submissions
  SET
    review_status = p_decision,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_comment = p_comment
  WHERE id = p_submission_id;

  -- Update task status based on decision
  IF p_decision = 'approved' THEN
    UPDATE public.tasks
    SET status = 'completed', updated_at = now()
    WHERE id = v_task.id;
  ELSE
    UPDATE public.tasks
    SET status = 'changes_requested', updated_at = now()
    WHERE id = v_task.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'decision', p_decision
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Row Level Security Policies
-- ----------------------------------------------------------------------------

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- Tasks:
-- Assignment members can view tasks
CREATE POLICY "Assignment members can view tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    public.is_assignment_member(assignment_id, auth.uid()) OR public.is_admin(auth.uid())
  );

-- Only leader can create or update task properties
CREATE POLICY "Leader can manage tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (
    public.is_assignment_leader(assignment_id, auth.uid()) OR public.is_admin(auth.uid())
  );

-- Task Submissions:
-- Assignment members can view all submissions for their assignment tasks
CREATE POLICY "Assignment members can view submissions"
  ON public.task_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_submissions.task_id
        AND (public.is_assignment_member(t.assignment_id, auth.uid()) OR public.is_admin(auth.uid()))
    )
  );
