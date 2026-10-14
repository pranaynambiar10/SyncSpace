import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Redirects authenticated users who haven't completed onboarding to /onboarding.
 * Use this inside ProtectedRoute to wrap routes that need a complete profile.
 */
export const OnboardingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading, session } = useAuth()

  if (loading) return null

  if (!session) return <Navigate to="/auth/signin" replace />

  if (profile && !profile.onboarding_done) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
