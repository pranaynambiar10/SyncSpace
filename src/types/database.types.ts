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

// ─── Public RPC return types ─────────────────────────────────────────────────

export interface AllowedDomainPublic {
  domain:          string
  label:           string | null
  university_name: string
}

// ─── Supabase Database type map (for createClient<Database>) ─────────────────

export interface Database {
  public: {
    Tables: {
      universities: {
        Row:    University
        Insert: Omit<University, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<University, 'id'>>
      }
      allowed_email_domains: {
        Row:    AllowedEmailDomain
        Insert: Omit<AllowedEmailDomain, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<AllowedEmailDomain, 'id' | 'created_at'>>
      }
      departments: {
        Row:    Department
        Insert: Omit<Department, 'id' | 'created_at'>
        Update: Partial<Omit<Department, 'id' | 'created_at'>>
      }
      semesters: {
        Row:    Semester
        Insert: Omit<Semester, 'id'>
        Update: Partial<Omit<Semester, 'id'>>
      }
      profiles: {
        Row:    Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'email' | 'email_verified' | 'verified_student' | 'created_at'>>
      }
      user_roles: {
        Row:    UserRole
        Insert: never          // insert only via admin_grant_role SECURITY DEFINER fn
        Update: never
      }
      notification_preferences: {
        Row:    NotificationPreferences
        Insert: Omit<NotificationPreferences, 'id'>
        Update: Partial<Omit<NotificationPreferences, 'id' | 'user_id'>>
      }
    }
    Views: {
      profile_basics: {
        Row: {
          id:            string
          full_name:     string
          avatar_url:    string | null
          department_id: string | null
          university_id: string | null
        }
      }
    }
    Functions: {
      get_allowed_domains: {
        Args:    Record<never, never>
        Returns: AllowedDomainPublic[]
      }
      validate_email_domain: {
        Args:    { p_email: string }
        Returns: boolean
      }
      is_admin: {
        Args:    { p_user_id?: string }
        Returns: boolean
      }
      admin_add_email_domain: {
        Args:    { p_domain: string; p_university_id: string; p_label?: string }
        Returns: AllowedEmailDomain
      }
      admin_set_domain_active: {
        Args:    { p_domain_id: string; p_is_active: boolean }
        Returns: AllowedEmailDomain
      }
      admin_grant_role: {
        Args:    { p_target_user_id: string }
        Returns: void
      }
      update_my_profile: {
        Args: {
          p_full_name:       string
          p_department_id:   string | null
          p_semester_id:     string | null
          p_course:          string | null
          p_academic_year:   string | null
          p_register_number: string | null
          p_avatar_url:      string | null
          p_timezone:        string
          p_onboarding_done: boolean
        }
        Returns: Profile
      }
    }
    Enums: Record<never, never>
  }
}
