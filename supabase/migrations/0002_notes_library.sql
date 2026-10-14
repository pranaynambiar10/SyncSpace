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
