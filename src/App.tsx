import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/guards/ProtectedRoute'
import { AdminRoute } from '@/components/guards/AdminRoute'
import { OnboardingGuard } from '@/components/guards/OnboardingGuard'
import { AppLayout } from '@/components/layout/AppLayout'

// Auth Pages
import SignIn from '@/pages/auth/SignIn'
import SignUp from '@/pages/auth/SignUp'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import EmailVerification from '@/pages/auth/EmailVerification'
import { AuthCallback } from '@/pages/auth/AuthCallback'

// Onboarding
import Onboarding from '@/pages/onboarding/Onboarding'

// Main Pages
import Dashboard from '@/pages/dashboard/Dashboard'
import Profile from '@/pages/profile/Profile'
import DomainManagement from '@/pages/admin/DomainManagement'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/auth/signup" element={<SignUp />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/auth/verify-email" element={<EmailVerification />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Onboarding Flow (Protected, but allows incomplete onboarding) */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <AppLayout />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Profile />} />

            {/* Admin Only Route */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <DomainManagement />
                </AdminRoute>
              }
            />

            {/* Placeholder for Assignments and Notes Library (Phases 2-3) */}
            <Route
              path="/assignments"
              element={
                <div className="p-8 text-center text-slate-400">
                  <h2 className="text-xl font-bold text-white mb-2">Assignments Module</h2>
                  <p className="text-sm">Phase 3 Group Assignments & Membership</p>
                </div>
              }
            />
            <Route
              path="/notes"
              element={
                <div className="p-8 text-center text-slate-400">
                  <h2 className="text-xl font-bold text-white mb-2">Academic Notes Library</h2>
                  <p className="text-sm">Phase 2 Subject & Module Repository</p>
                </div>
              }
            />
          </Route>

          {/* Catch-all 404 Route */}
          <Route
            path="*"
            element={
              <div className="min-h-dvh flex flex-col items-center justify-center bg-surface-base text-center p-6">
                <h1 className="text-4xl font-extrabold text-white mb-2">404</h1>
                <p className="text-slate-400 mb-6">The page you are looking for does not exist.</p>
                <a href="/dashboard" className="btn btn-primary h-9 px-4 text-sm">
                  Return to Dashboard
                </a>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
