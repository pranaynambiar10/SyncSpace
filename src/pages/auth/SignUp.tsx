import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Info } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { useDomainValidation } from '@/hooks/useDomainValidation'
import { friendlyError } from '@/lib/utils'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { ok: password.length >= 8,              label: '8+ characters' },
    { ok: /[A-Z]/.test(password),           label: 'Uppercase letter' },
    { ok: /[0-9]/.test(password),           label: 'Number' },
    { ok: /[^A-Za-z0-9]/.test(password),   label: 'Special character' },
  ]
  const score = checks.filter(c => c.ok).length

  if (!password) return null

  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500']
  const labels = ['Weak', 'Fair', 'Good', 'Strong']

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score - 1] : 'bg-surface-elevated'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {checks.map(c => (
            <span
              key={c.label}
              className={`text-xs transition-colors ${c.ok ? 'text-emerald-400' : 'text-slate-600'}`}
            >
              {c.ok ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span className={`text-xs font-medium ${colors[score - 1].replace('bg-', 'text-')}`}>
            {labels[score - 1]}
          </span>
        )}
      </div>
    </div>
  )
}

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate   = useNavigate()
  const { validate, domainError, matchedDomain, allowedDomains, loadDomains } = useDomainValidation()

  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)

  // Load domain list once for the hint
  useEffect(() => { loadDomains() }, [loadDomains])

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    validate(e.target.value)
  }, [validate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    // Client-side validation
    if (!fullName.trim()) { setFormError('Please enter your full name.'); return }
    if (!email.trim())    { setFormError('Please enter your email.');     return }
    if (domainError)      { setFormError(domainError);                    return }
    if (password.length < 8) { setFormError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setFormError('Passwords do not match.'); return }

    setLoading(true)
    const { error: err } = await signUp(email.trim().toLowerCase(), password, fullName.trim())
    setLoading(false)

    if (err) {
      setFormError(friendlyError(err))
      return
    }

    // Redirect to the dedicated email verification page, passing email for resend
    navigate('/auth/verify-email', { state: { email: email.trim().toLowerCase() } })
  }

  const domainHint = allowedDomains.length > 0
    ? `Allowed domains: ${allowedDomains.slice(0, 2).map(d => `@${d.domain}`).join(', ')}${allowedDomains.length > 2 ? '…' : ''}`
    : undefined

  return (
    <AuthLayout tagline="Join your university workspace.">
      <div className="space-y-7">
        <div className="lg:hidden flex justify-center">
          <Logo size="lg" variant="full" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-100">Create your account</h2>
          <p className="mt-1 text-sm text-slate-400">
            Use your university email to get started
          </p>
        </div>

        {formError && (
          <Alert variant="error" onDismiss={() => setFormError(null)}>
            {formError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input
            id="fullName"
            type="text"
            label="Full name"
            placeholder="Your name as on your ID card"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            icon={<User size={16} />}
            autoComplete="name"
            required
          />

          <Input
            id="email"
            type="email"
            label="University email"
            placeholder="you@ug.cusat.ac.in"
            value={email}
            onChange={handleEmailChange}
            icon={<Mail size={16} />}
            error={domainError}
            success={matchedDomain ? `Recognised: ${matchedDomain.university_name}` : null}
            hint={domainHint}
            autoComplete="email"
            required
          />

          <div>
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="Create a strong password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              autoComplete="new-password"
              required
            />
            <PasswordStrength password={password} />
          </div>

          <Input
            id="confirm"
            type="password"
            label="Confirm password"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            icon={<Lock size={16} />}
            error={confirm && confirm !== password ? "Passwords don't match" : null}
            success={confirm && confirm === password && confirm.length > 0 ? 'Passwords match' : null}
            autoComplete="new-password"
            required
          />

          <div className="glass rounded-xl p-3 flex gap-2.5 text-xs text-slate-400">
            <Info size={14} className="flex-shrink-0 text-brand-400 mt-0.5" />
            <span>
              By signing up you confirm this is your real university email.
              Your account will be verified against the allowed-domain list.
            </span>
          </div>

          <Button type="submit" fullWidth size="lg" loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/auth/signin" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
