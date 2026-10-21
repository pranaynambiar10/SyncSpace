-- ============================================================================
-- SyncSpace Campus — Migration 0001: Foundation, Profiles & Auth Governance
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Universities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  country text DEFAULT 'India',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. Allowed Email Domains
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.allowed_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  label text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT domain_format_check CHECK (domain ~ '^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$')
);

-- ----------------------------------------------------------------------------
-- 3. Departments & Semesters
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order int DEFAULT 1,
  is_active boolean DEFAULT true
);

-- ----------------------------------------------------------------------------
-- 4. Profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  university_id uuid REFERENCES public.universities(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  course text,
  academic_year text,
  register_number text, -- Protected from teammates!
  email text NOT NULL,   -- Protected from teammates!
  email_verified boolean DEFAULT false,
  verified_student boolean DEFAULT false,
  avatar_url text,
  timezone text DEFAULT 'Asia/Kolkata',
  onboarding_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. User Roles (Single Source of Truth for Admin)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  role text NOT NULL CHECK (role IN ('admin')),
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. Notification Preferences
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  task_assigned boolean DEFAULT true,
  deadline_changed boolean DEFAULT true,
  new_announcement boolean DEFAULT true,
  submission_received boolean DEFAULT true,
  submission_approved boolean DEFAULT true,
  changes_requested boolean DEFAULT true,
  task_overdue boolean DEFAULT true,
  member_joined boolean DEFAULT true,
  assignment_closed boolean DEFAULT true,
  reminder_72h boolean DEFAULT true,
  reminder_24h boolean DEFAULT true,
  reminder_2h boolean DEFAULT true,
  weekly_digest boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. Teammate Privacy View (Excludes email & register_number)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.profile_basics AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.department_id,
  p.university_id,
  p.verified_student
FROM public.profiles p;

-- ----------------------------------------------------------------------------
-- 8. Functions & Triggers
-- ----------------------------------------------------------------------------

-- Check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
END;
$$;

-- Domain validation function (supports CUSAT institutional domains and Gmail)
CREATE OR REPLACE FUNCTION public.validate_email_domain(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_domain text;
  v_allowed boolean;
BEGIN
  v_domain := lower(split_part(p_email, '@', 2));

  -- Explicitly allow standard student Gmail accounts
  IF v_domain = 'gmail.com' THEN
    RETURN true;
  END IF;

  -- Verify institutional domain in allowed_email_domains
  SELECT EXISTS(
    SELECT 1 FROM public.allowed_email_domains
    WHERE domain = v_domain AND is_active = true
  ) INTO v_allowed;

  RETURN v_allowed;
END;
$$;

-- Public RPC for fetching allowed domains in frontend
CREATE OR REPLACE FUNCTION public.get_allowed_domains()
RETURNS TABLE (
  domain text,
  label text,
  university_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    d.domain,
    d.label,
    u.name AS university_name
  FROM public.allowed_email_domains d
  JOIN public.universities u ON d.university_id = u.id
  WHERE d.is_active = true
  ORDER BY u.name, d.domain;
$$;

-- Protect critical profile columns against client-side tampering
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent user from changing email, email_verified, or verified_student directly
  IF NEW.email <> OLD.email THEN
    NEW.email := OLD.email;
  END IF;
  IF NEW.email_verified IS DISTINCT FROM OLD.email_verified THEN
    NEW.email_verified := OLD.email_verified;
  END IF;
  IF NEW.verified_student IS DISTINCT FROM OLD.verified_student THEN
    NEW.verified_student := OLD.verified_student;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_columns ON public.profiles;
CREATE TRIGGER tr_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_columns();

-- Handle new user signup trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
  v_is_verified_student boolean := false;
  v_full_name text;
BEGIN
  v_domain := lower(split_part(NEW.email, '@', 2));

  -- Check if domain is authorized institutional domain
  IF v_domain <> 'gmail.com' AND public.validate_email_domain(NEW.email) THEN
    v_is_verified_student := true;
  END IF;

  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    email_verified,
    verified_student,
    onboarding_done
  ) VALUES (
    NEW.id,
    v_full_name,
    lower(NEW.email),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    v_is_verified_student,
    false
  );

  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 9. Row Level Security (RLS)
-- ----------------------------------------------------------------------------

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Universities: readable by all, write by admin
CREATE POLICY "Universities are viewable by everyone"
  ON public.universities FOR SELECT
  USING (true);

CREATE POLICY "Universities manageable by admin"
  ON public.universities FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allowed domains: readable by all, write by admin
CREATE POLICY "Allowed domains viewable by everyone"
  ON public.allowed_email_domains FOR SELECT
  USING (true);

CREATE POLICY "Allowed domains manageable by admin"
  ON public.allowed_email_domains FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Departments: readable by all, write by admin
CREATE POLICY "Departments viewable by everyone"
  ON public.departments FOR SELECT
  USING (true);

CREATE POLICY "Departments manageable by admin"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Semesters: readable by all, write by admin
CREATE POLICY "Semesters viewable by everyone"
  ON public.semesters FOR SELECT
  USING (true);

CREATE POLICY "Semesters manageable by admin"
  ON public.semesters FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Profiles:
-- 1. User can read their own complete row (including email and register_number)
-- 2. Admin can read all profiles
-- 3. Teammates read public basics via profile_basics view
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User roles: readable by self or admin; only admin can modify
CREATE POLICY "Users can view own role or admin views all"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admin can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Notification Preferences: user manages own
CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- ============================================================================
-- SyncSpace Campus — Migration 0002: Academic Notes Library
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Subjects (per Department & Semester)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. Subject Modules (Syllabus Units 1 to 5)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subject_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  module_number int NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subject_id, module_number)
);

-- ----------------------------------------------------------------------------
-- 3. Academic Notes (Deliverables / Study Material)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.subject_modules(id) ON DELETE CASCADE,
  uploader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  file_extension text NOT NULL,
  download_count int DEFAULT 0,
  view_count int DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0.00,
  total_ratings int DEFAULT 0,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. Note Ratings (1 to 5 Stars + Qualitative Review)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.note_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.academic_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(note_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 5. Note Bookmarks (Personal Saved Notes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.note_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.academic_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 6. Top-Rated Notes Discovery View
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.top_rated_notes_view AS
SELECT
  n.id,
  n.subject_id,
  n.module_id,
  n.uploader_id,
  n.title,
  n.description,
  n.file_path,
  n.file_name,
  n.file_size,
  n.file_extension,
  n.download_count,
  n.view_count,
  n.average_rating,
  n.total_ratings,
  n.is_verified,
  n.created_at,
  s.name AS subject_name,
  s.code AS subject_code,
  s.department_id,
  m.module_number,
  m.title AS module_title,
  p.full_name AS uploader_name,
  p.avatar_url AS uploader_avatar
FROM public.academic_notes n
JOIN public.subjects s ON n.subject_id = s.id
JOIN public.subject_modules m ON n.module_id = m.id
LEFT JOIN public.profiles p ON n.uploader_id = p.id
WHERE n.is_active = true
ORDER BY n.average_rating DESC, n.download_count DESC;

-- ----------------------------------------------------------------------------
-- 7. Functions & Triggers for Ratings and Download Counts
-- ----------------------------------------------------------------------------

-- Recalculate average rating and count on change
CREATE OR REPLACE FUNCTION public.update_note_rating_aggregate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_note_id uuid;
  v_avg numeric(3,2);
  v_count int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_note_id := OLD.note_id;
  ELSE
    v_note_id := NEW.note_id;
  END IF;

  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00),
    COUNT(*)
  INTO v_avg, v_count
  FROM public.note_ratings
  WHERE note_id = v_note_id;

  UPDATE public.academic_notes
  SET
    average_rating = v_avg,
    total_ratings = v_count,
    updated_at = now()
  WHERE id = v_note_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_update_note_rating_aggregate ON public.note_ratings;
CREATE TRIGGER tr_update_note_rating_aggregate
  AFTER INSERT OR UPDATE OR DELETE ON public.note_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_note_rating_aggregate();

-- Atomic increment for download count
CREATE OR REPLACE FUNCTION public.increment_note_download(p_note_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.academic_notes
  SET download_count = download_count + 1
  WHERE id = p_note_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. Row Level Security Policies
-- ----------------------------------------------------------------------------

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_bookmarks ENABLE ROW LEVEL SECURITY;

-- Subjects & Modules: readable by all authenticated users
CREATE POLICY "Subjects readable by authenticated users"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Modules readable by authenticated users"
  ON public.subject_modules FOR SELECT
  TO authenticated
  USING (true);

-- Subjects & Modules: manageable by admin or verified faculty/student
CREATE POLICY "Subjects manageable by admin"
  ON public.subjects FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Modules manageable by admin"
  ON public.subject_modules FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Academic Notes: readable by all authenticated users
CREATE POLICY "Notes viewable by authenticated users"
  ON public.academic_notes FOR SELECT
  TO authenticated
  USING (is_active = true OR uploader_id = auth.uid() OR public.is_admin(auth.uid()));

-- Academic Notes: upload by authenticated users
CREATE POLICY "Notes uploadable by authenticated users"
  ON public.academic_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploader_id);

-- Academic Notes: update/delete by uploader or admin
CREATE POLICY "Notes manageable by uploader or admin"
  ON public.academic_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploader_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = uploader_id OR public.is_admin(auth.uid()));

-- Note Ratings: viewable by all, write by rating author
CREATE POLICY "Ratings viewable by authenticated users"
  ON public.note_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can rate notes"
  ON public.note_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify own ratings"
  ON public.note_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON public.note_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Bookmarks: user can view, add, and remove own bookmarks
CREATE POLICY "Users view own bookmarks"
  ON public.note_bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users add bookmarks"
  ON public.note_bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove bookmarks"
  ON public.note_bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
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
-- ============================================================================
-- SyncSpace Campus — Initial Master Seed Data
-- ============================================================================

-- 1. University: CUSAT
INSERT INTO public.universities (id, name, slug, country, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Cochin University of Science and Technology',
  'cusat',
  'India',
  true
) ON CONFLICT (slug) DO NOTHING;

-- 2. Allowed Email Domains (CUSAT Domains)
INSERT INTO public.allowed_email_domains (university_id, domain, label, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'ug.cusat.ac.in', 'CUSAT Undergraduate Students', true),
  ('11111111-1111-1111-1111-111111111111', 'pg.cusat.ac.in', 'CUSAT Postgraduate Students', true),
  ('11111111-1111-1111-1111-111111111111', 'cusat.ac.in', 'CUSAT Faculty & Staff', true)
ON CONFLICT (domain) DO NOTHING;

-- 3. Departments
INSERT INTO public.departments (id, university_id, name, code, is_active)
VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Department of Computer Applications (DCA)', 'DCA', true),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Department of Computer Science (DCS)', 'DCS', true),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'School of Engineering - IT', 'SOE-IT', true),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'School of Engineering - CS', 'SOE-CS', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Semesters (S1 to S8)
INSERT INTO public.semesters (university_id, label, sort_order, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Semester 1', 1, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 2', 2, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 3', 3, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 4', 4, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 5', 5, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 6', 6, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 7', 7, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 8', 8, true);

-- 5. Sample Subjects for DCA
INSERT INTO public.subjects (id, department_id, name, code, description, is_active)
VALUES
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'Advanced Database Management Systems', 'CAS 2101', 'Relational algebra, query optimization, concurrency control, and distributed storage systems.', true),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', 'Cloud Computing & Distributed Architecture', 'CAS 2102', 'Virtualization, microservices, containerization, and serverless compute.', true),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', 'Software Engineering & Agile Methodologies', 'CAS 2103', 'Scrum ceremonies, sprint planning, CI/CD, and quality assurance.', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Sample Syllabus Modules (CAS 2101 Modules 1 to 5)
INSERT INTO public.subject_modules (subject_id, module_number, title, description)
VALUES
  ('33333333-3333-3333-3333-333333333301', 1, 'Relational Model & Formal Query Languages', 'Relational calculus, domain relational calculus, and SQL engine mechanics.'),
  ('33333333-3333-3333-3333-333333333301', 2, 'Database Normalization & Dependency Theory', 'Functional dependencies, 1NF, 2NF, 3NF, BCNF, 4NF, and lossless joins.'),
  ('33333333-3333-3333-3333-333333333301', 3, 'Query Processing & Optimization', 'Parsing, query execution plans, cost-based estimation, and indexing with B-Trees.'),
  ('33333333-3333-3333-3333-333333333301', 4, 'Transaction Management & Concurrency Control', 'ACID properties, 2PL, timestamp ordering, and deadlock detection algorithms.'),
  ('33333333-3333-3333-3333-333333333301', 5, 'Distributed Databases & NoSQL Models', 'CAP theorem, consistent hashing, replication strategies, and document databases.')
ON CONFLICT (subject_id, module_number) DO NOTHING;
