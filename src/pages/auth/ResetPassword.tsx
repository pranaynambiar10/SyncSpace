import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, CheckCircle2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/contexts/AuthContext'
import { friendlyError } from '@/lib/utils'

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [done,      setDone]      = useState(false)
  const [loading,   setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    const { error: err } = await updatePassword(password)
    setLoading(false)

    if (err) { setError(friendlyError(err)); return }
    setDone(true)
  }

  if (done) {
    return (
      <AuthLayout tagline="Password updated.">
        <div className="text-center space-y-6 animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-emerald-900/30 border border-emerald-700/40 flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Password updated!</h2>
            <p className="text-slate-400 text-sm">Your new password is active. You can now sign in.</p>
          </div>
          <Button fullWidth size="lg" onClick={() => navigate('/auth/signin')}>Sign In</Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout tagline="Choose a new password.">
      <div className="space-y-7">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Reset your password</h2>
          <p className="mt-1 text-sm text-slate-400">Enter and confirm your new password.</p>
        </div>

        {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input
            id="password"
            type="password"
            label="New password"
            placeholder="At least 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<Lock size={16} />}
            autoComplete="new-password"
            required
          />
          <Input
            id="confirm"
            type="password"
            label="Confirm password"
            placeholder="Repeat your new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            icon={<Lock size={16} />}
            error={confirm && confirm !== password ? "Passwords don't match" : null}
            success={confirm && confirm === password && confirm.length > 0 ? 'Passwords match' : null}
            autoComplete="new-password"
            required
          />
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Update Password
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}
