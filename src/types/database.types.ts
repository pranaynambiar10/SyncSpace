/**
 * TypeScript types mirroring the Supabase PostgreSQL schema.
 * Phase 1 tables: universities, allowed_email_domains, departments,
 * semesters, profiles, user_roles, notification_preferences.
 *
 * Generated from the migration; keep in sync with 0001_foundation.sql.
 */

export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Row types ───────────────────────────────────────────────────────────────

export interface University {
  id:         string
  name:       string
  slug:       string
  country:    string
  is_active:  boolean
  created_at: string
  updated_at: string
}

export interface AllowedEmailDomain {
  id:            string
  university_id: string
  domain:        string
  label:         string | null
  is_active:     boolean
  created_by:    string | null
  created_at:    string
  updated_at:    string
}

export interface Department {
  id:            string
  university_id: string
  name:          string
  code:          string | null
  is_active:     boolean
  created_at:    string
}

export interface Semester {
  id:            string
  university_id: string
  label:         string
  sort_order:    number
  is_active:     boolean
}

export interface Profile {
  id:               string
  full_name:        string
  university_id:    string | null
  department_id:    string | null
  semester_id:      string | null
  course:           string | null
  academic_year:    string | null
  register_number:  string | null
  email:            string
  email_verified:   boolean
  verified_student: boolean
  /** No is_admin column; admin role is in user_roles table */
  avatar_url:       string | null
  timezone:         string
  onboarding_done:  boolean
  created_at:       string
  updated_at:       string
}

export interface UserRole {
  id:         string
  user_id:    string
  role:       'admin'
  granted_by: string | null
  granted_at: string
}

export interface NotificationPreferences {
  id:                  string
  user_id:             string
  task_assigned:       boolean
  deadline_changed:    boolean
  new_announcement:    boolean
  submission_received: boolean
  submission_approved: boolean
  changes_requested:   boolean
  task_overdue:        boolean
  member_joined:       boolean
  assignment_closed:   boolean
  achievement_earned:  boolean
  deletion_scheduled:  boolean
  reminder_72h:        boolean
  reminder_24h:        boolean
  reminder_2h:         boolean
  weekly_digest:       boolean
  updated_at:          string
}

export interface Subject {
  id:            string
  department_id: string
  semester_id:   string | null
  name:          string
  code:          string
  description:   string | null
  is_active:     boolean
  created_at:    string
}

export interface SubjectModule {
  id:            string
  subject_id:    string
  module_number: number
  title:         string
  description:   string | null
  created_at:    string
}

export interface AcademicNote {
  id:             string
  subject_id:     string
  module_id:      string
  uploader_id:    string | null
  title:          string
  description:    string | null
  file_path:      string
  file_name:      string
  file_size:      number
  mime_type:      string
  file_extension: string
  download_count: number
  view_count:     number
  average_rating: number
  total_ratings:  number
  is_verified:    boolean
  is_active:      boolean
  created_at:     string
  updated_at:     string
}

export interface NoteRating {
  id:          string
  note_id:     string
  user_id:     string
  rating:      number
  review_text: string | null
  created_at:  string
  updated_at:  string
}

export interface NoteBookmark {
  id:         string
  note_id:    string
  user_id:    string
  created_at: string
}

// ─── Public RPC return types ─────────────────────────────────────────────────

export interface AllowedDomainPublic {
  domain:          string
  label:           string | null
  university_name: string
}

// ─── Supabase Database type map (for createClient<Database>) ─────────────────

export type Database = any

