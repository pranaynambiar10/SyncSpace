import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Supabase Auth session (null = signed out) */
  session:    Session | null
  /** Supabase Auth user object */
  user:       User | null
  /** Profile row from public.profiles (null = not yet loaded or signed out) */
  profile:    Profile | null
  /** True while the initial session check is running */
  loading:    boolean
  /** True if the current user has the 'admin' role in public.user_roles */
  isAdmin:    boolean
  /** True if profile.onboarding_done === true */
  onboardingDone: boolean
  /** Sign in with email + password */
  signIn:     (email: string, password: string) => Promise<{ error: string | null }>
  /** Sign up with email + password + full name */
  signUp:     (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  /** Sign out */
  signOut:    () => Promise<void>
  /** Send password reset email */
  resetPassword: (email: string) => Promise<{ error: string | null }>
  /** Update the password (used on the reset-password page via the link) */
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
  /** Refresh the profile from the database */
  refreshProfile: () => Promise<void>
}

// ─── Context creation ─────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session,  setSession]  = useState<Session | null>(null)
  const [user,     setUser]     = useState<User | null>(null)
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [isAdmin,  setIsAdmin]  = useState(false)

  // Avoid stale-closure issues in the subscription callback
  const profileRef = useRef(profile)
  profileRef.current = profile

  // ── Fetch profile + admin status ──────────────────────────────────────────

  const fetchProfile = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: adminFlag }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.rpc('is_admin', { p_user_id: uid } as any),
    ])
    setProfile((prof as unknown as Profile) ?? null)
    setIsAdmin(adminFlag === true)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id)
  }, [user, fetchProfile])

  // ── Bootstrap session on mount ────────────────────────────────────────────

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => { if (mounted) setLoading(false) })
      } else {
        setLoading(false)
      }
    })

    // Listen for auth state changes (sign in, sign out, token refresh, verification)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (!mounted) return
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          await fetchProfile(s.user.id)
        } else {
          setProfile(null)
          setIsAdmin(false)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // ── Auth actions ──────────────────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string,
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setIsAdmin(false)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  // ── Value ─────────────────────────────────────────────────────────────────

  const value: AuthContextValue = {
    session,
    user,
    profile,
    loading,
    isAdmin,
    onboardingDone: profile?.onboarding_done ?? false,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
