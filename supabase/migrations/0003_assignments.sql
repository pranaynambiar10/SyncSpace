-- ============================================================================
-- SyncSpace Campus — Migration 0003: Group Assignments & Membership
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Assignment Categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text UNIQUE NOT NULL,
  sort_order int DEFAULT 1,
  is_active boolean DEFAULT true
);

INSERT INTO public.assignment_categories (name, slug, sort_order) VALUES
  ('Mini-Project', 'mini-project', 1),
  ('Group Assignment', 'group-assignment', 2),
  ('Seminar', 'seminar', 3),
  ('Internship Report', 'internship-report', 4),
  ('Laboratory Assignment', 'laboratory-assignment', 5),
  ('Research Paper', 'research-paper', 6),
  ('Presentation', 'presentation', 7),
  ('Other Academic Work', 'other', 8)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Assignments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category_id uuid REFERENCES public.assignment_categories(id) ON DELETE SET NULL,
  university_id uuid REFERENCES public.universities(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  subject_course text,
  description text,
  instructions text,
  acceptance_criteria text,
  leader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  overall_deadline timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'active',
  max_members int DEFAULT 10,
  allow_join_by_code boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. Assignment Members
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignment_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('leader', 'member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 4. Assignment Join Codes (Stored as SHA-256 Hashes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignment_join_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_uses int DEFAULT 10,
  uses_so_far int DEFAULT 0,
  expires_at timestamptz NOT NULL,
  is_revoked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. Helper & Security Functions
-- ----------------------------------------------------------------------------

-- Check if user is a member of an assignment
CREATE OR REPLACE FUNCTION public.is_assignment_member(p_assignment_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignment_members
    WHERE assignment_id = p_assignment_id AND user_id = p_user_id
  );
$$;

-- Check if user is the leader of an assignment
CREATE OR REPLACE FUNCTION public.is_assignment_leader(p_assignment_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignment_members
    WHERE assignment_id = p_assignment_id AND user_id = p_user_id AND role = 'leader'
  );
$$;

-- Atomic assignment creator RPC
CREATE OR REPLACE FUNCTION public.create_new_assignment(
  p_title text,
  p_category_id uuid,
  p_department_id uuid,
  p_semester_id uuid,
  p_subject_course text,
  p_description text,
  p_overall_deadline timestamptz,
  p_max_members int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id uuid;
  v_raw_code text;
  v_code_hash text;
BEGIN
  -- Insert assignment
  INSERT INTO public.assignments (
    title,
    category_id,
    department_id,
    semester_id,
    subject_course,
    description,
    leader_id,
    overall_deadline,
    max_members,
    status
  ) VALUES (
    p_title,
    p_category_id,
    p_department_id,
    p_semester_id,
    p_subject_course,
    p_description,
    auth.uid(),
    p_overall_deadline,
    COALESCE(p_max_members, 10),
    'active'
  )
  RETURNING id INTO v_assignment_id;

  -- Add leader to assignment_members
  INSERT INTO public.assignment_members (
    assignment_id,
    user_id,
    role
  ) VALUES (
    v_assignment_id,
    auth.uid(),
    'leader'
  );

  -- Generate 8-character random alphanumeric join code
  v_raw_code := upper(substring(replace(encode(gen_random_bytes(6), 'base64'), '/', 'X') from 1 for 8));
  v_code_hash := encode(digest(v_raw_code, 'sha256'), 'hex');

  -- Store hash with 7 days expiration
  INSERT INTO public.assignment_join_codes (
    assignment_id,
    code_hash,
    created_by,
    max_uses,
    expires_at
  ) VALUES (
    v_assignment_id,
    v_code_hash,
    auth.uid(),
    COALESCE(p_max_members, 10),
    now() + interval '7 days'
  );

  RETURN jsonb_build_object(
    'assignment_id', v_assignment_id,
    'join_code', v_raw_code
  );
END;
$$;

-- Join assignment by raw code RPC
CREATE OR REPLACE FUNCTION public.join_assignment_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_code text;
  v_code_hash text;
  v_record record;
  v_member_count int;
  v_max_members int;
BEGIN
  v_clean_code := upper(trim(p_code));
  v_code_hash := encode(digest(v_clean_code, 'sha256'), 'hex');

  -- Find code record
  SELECT * INTO v_record
  FROM public.assignment_join_codes
  WHERE code_hash = v_code_hash
    AND is_revoked = false
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid, expired, or revoked invitation code.');
  END IF;

  -- Check if user is already a member
  IF public.is_assignment_member(v_record.assignment_id, auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You are already a member of this assignment.');
  END IF;

  -- Check max group size limit
  SELECT COUNT(*), COALESCE(a.max_members, 10)
  INTO v_member_count, v_max_members
  FROM public.assignment_members am
  JOIN public.assignments a ON am.assignment_id = a.id
  WHERE a.id = v_record.assignment_id
  GROUP BY a.max_members;

  IF v_member_count >= v_max_members THEN
    RETURN jsonb_build_object('success', false, 'message', 'This group has reached its maximum member limit (10 members).');
  END IF;

  -- Add user as member
  INSERT INTO public.assignment_members (
    assignment_id,
    user_id,
    role
  ) VALUES (
    v_record.assignment_id,
    auth.uid(),
    'member'
  );

  -- Increment code usage
  UPDATE public.assignment_join_codes
  SET uses_so_far = uses_so_far + 1
  WHERE id = v_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', v_record.assignment_id
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Row Level Security Policies
-- ----------------------------------------------------------------------------

ALTER TABLE public.assignment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_join_codes ENABLE ROW LEVEL SECURITY;

-- Categories: readable by all
CREATE POLICY "Categories viewable by all authenticated users"
  ON public.assignment_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Assignments:
-- Strict RLS Isolation: Only members can SELECT an assignment
CREATE POLICY "Members can view their assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (public.is_assignment_member(id, auth.uid()) OR public.is_admin(auth.uid()));

-- Only leader can update assignment details
CREATE POLICY "Leader can update assignment"
  ON public.assignments FOR UPDATE
  TO authenticated
  USING (leader_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (leader_id = auth.uid() OR public.is_admin(auth.uid()));

-- Assignment Members:
-- Members of the assignment can see fellow team members
CREATE POLICY "Members can view teammate membership"
  ON public.assignment_members FOR SELECT
  TO authenticated
  USING (public.is_assignment_member(assignment_id, auth.uid()) OR public.is_admin(auth.uid()));

-- Members can leave (delete own membership row, if not leader)
CREATE POLICY "Members can leave assignment"
  ON public.assignment_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND role <> 'leader');

-- Join codes: Only leader can view join codes for their assignment
CREATE POLICY "Leader can view join codes"
  ON public.assignment_join_codes FOR SELECT
  TO authenticated
  USING (public.is_assignment_leader(assignment_id, auth.uid()) OR public.is_admin(auth.uid()));
