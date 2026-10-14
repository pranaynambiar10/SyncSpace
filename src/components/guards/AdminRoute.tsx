import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Shield } from 'lucide-react'

/**
 * Wraps admin-only routes.
 * Shows a spinner while loading; redirects non-admins to dashboard.
 */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loading, session } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-base">
        <span className="spinner w-8 h-8 text-brand-500" />
      </div>
    )
  }

  if (!session) return <Navigate to="/auth/signin" replace />

  if (!isAdmin) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-surface-base gap-4 p-6 text-center">
        <Shield size={48} className="text-slate-600" />
        <h1 className="text-xl font-semibold text-slate-300">Access Denied</h1>
        <p className="text-slate-500 max-w-sm">
          You do not have admin privileges. Contact a system administrator
          if you believe this is a mistake.
        </p>
        <a href="/dashboard" className="btn-secondary btn h-9 px-4 text-sm">
          Back to Dashboard
        </a>
      </div>
    )
  }

  return <>{children}</>
}
