import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Redirects unauthenticated users to /auth/signin.
 * Saves the attempted URL so signin can redirect back afterward.
 * Waits for the initial session check to complete before deciding.
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-base">
        <span className="spinner w-8 h-8 text-brand-500" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />
  }

  return <>{children}</>
}
