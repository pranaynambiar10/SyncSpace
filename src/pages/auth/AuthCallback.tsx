/**
 * /auth/callback — Supabase redirects here after email verification links.
 * Supabase handles the session automatically via detectSessionInUrl=true.
 * This component just waits for the session to settle, then redirects.
 */
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthCallback() {
  const { session, loading, onboardingDone } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!session) {
      // Something went wrong (expired link, etc.)
      navigate('/auth/signin?error=link_expired', { replace: true })
      return
    }
    if (onboardingDone) {
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/onboarding', { replace: true })
    }
  }, [session, loading, onboardingDone, navigate])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface-base gap-4">
      <span className="spinner w-10 h-10 text-brand-500" />
      <p className="text-slate-400 text-sm">Verifying your account…</p>
    </div>
  )
}
