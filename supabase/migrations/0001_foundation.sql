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
