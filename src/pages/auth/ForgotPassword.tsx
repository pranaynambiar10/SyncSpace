import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/contexts/AuthContext'
import { friendlyError } from '@/lib/utils'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  const [email,   setEmail]   = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) { setError('Please enter your email address.'); return }

    setLoading(true)
    const { error: err } = await resetPassword(email.trim().toLowerCase())
    setLoading(false)

    // Always show success to avoid leaking account existence
    if (err) console.error('[forgot-password]', err)
    setSent(true)
  }

  if (sent) {
    return (
      <AuthLayout tagline="Password reset requested.">
        <div className="text-center space-y-6 animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-brand-900/40 border border-brand-700/40 flex items-center justify-center mx-auto">
            <Mail size={36} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Check your email</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
              If <span className="text-brand-300 font-medium">{email}</span> is a registered account,
              you'll receive a reset link shortly.
            </p>
          </div>
          <Button variant="secondary" fullWidth onClick={() => navigate('/auth/signin')}>
            Back to Sign In
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout tagline="Reset your password.">
      <div className="space-y-7">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Forgot your password?</h2>
          <p className="mt-1 text-sm text-slate-400">
            Enter your university email and we'll send a reset link.
          </p>
        </div>

        {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}

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
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Send Reset Link
          </Button>
        </form>

        <Button variant="ghost" fullWidth onClick={() => navigate('/auth/signin')}>
          Back to Sign In
        </Button>
      </div>
    </AuthLayout>
  )
}
