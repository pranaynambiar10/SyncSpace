import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { friendlyError } from '@/lib/utils'

export default function SignIn() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from       = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)
    const { error: err } = await signIn(email.trim().toLowerCase(), password)
    setLoading(false)

    if (err) {
      setError(friendlyError(err))
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <AuthLayout tagline="Your academic work, organised and verified.">
      <div className="space-y-8">
        {/* Mobile-only logo */}
        <div className="lg:hidden flex justify-center">
          <Logo size="lg" variant="full" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-100">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-400">
            Sign in to your SyncSpace Campus account
          </p>
        </div>

        {error && (
          <Alert variant="error" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input
            id="email"
            type="email"
            label="University email"
            placeholder="you@ug.cusat.ac.in"
            value={email}
            onChange={e => setEmail(e.target.value)}
            icon={<Mail size={16} />}
            autoComplete="email"
            required
          />

          <div className="space-y-1.5">
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              autoComplete="current-password"
              required
            />
            <div className="flex justify-end">
              <Link
                to="/auth/forgot-password"
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
          >
            Sign In
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-surface-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-surface-base text-slate-500">Don't have an account?</span>
          </div>
        </div>

        <Button
          variant="secondary"
          fullWidth
          size="lg"
          onClick={() => navigate('/auth/signup')}
        >
          Create an account
        </Button>
      </div>
    </AuthLayout>
  )
}
