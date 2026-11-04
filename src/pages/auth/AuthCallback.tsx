/**
 * /auth/callback — Supabase redirects here after:
 *   1. Email verification links (type=signup)
 *   2. Password-reset links    (type=recovery)
 *
 * Supabase handles the session automatically via detectSessionInUrl=true.
 * We inspect the URL hash to decide where to redirect next.
 */
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthCallback() {
  const { session, loading, onboardingDone } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    // Check the URL hash Supabase appends to the redirect URL.
    // e.g. #access_token=...&type=recovery  or  #access_token=...&type=signup
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const type = params.get('type')

    if (!session) {
      navigate('/auth/signin?error=link_expired', { replace: true })
      return
    }

    if (type === 'recovery') {
      // Password reset link — send to the reset-password form
      navigate('/auth/reset-password', { replace: true })
      return
    }

    // Default: email confirmation / general login callback
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
