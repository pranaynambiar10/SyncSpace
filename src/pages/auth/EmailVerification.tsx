import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mail, CheckCircle2, RefreshCw, ArrowLeft, ExternalLink } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { supabase } from '@/lib/supabase'

export default function EmailVerification() {
  const location = useLocation()
  const email = (location.state as { email?: string })?.email || ''
  const [resending, setResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleResend = async () => {
    if (!email) {
      setResendStatus({
        type: 'error',
        message: 'No email address found. Please try signing in again.',
      })
      return
    }

    setResending(true)
    setResendStatus(null)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      if (error) throw error
      setResendStatus({
        type: 'success',
        message: 'A fresh verification link has been sent to your inbox.',
      })
    } catch (err: unknown) {
      setResendStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to resend verification email',
      })
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout
      title="Verify your academic email"
      subtitle="We sent a confirmation link to activate your university account"
    >
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-3">
            <Mail size={28} />
          </div>
          <p className="text-sm text-slate-300 font-medium break-all">
            {email || 'your registered institutional email'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Click the link in the verification email to confirm that you belong to an authorized campus domain.
          </p>
        </div>

        {resendStatus && (
          <Alert
            variant={resendStatus.type === 'success' ? 'success' : 'danger'}
            title={resendStatus.type === 'success' ? 'Verification email sent' : 'Delivery problem'}
          >
            {resendStatus.message}
          </Alert>
        )}

        <div className="p-4 rounded-xl bg-surface-base/80 border border-surface-border/60 space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-brand-400" />
            Verification Checklist
          </h4>
          <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
            <li>Check your institutional inbox (and Spam/Junk folder)</li>
            <li>Look for an email from SyncSpace Campus / Supabase Auth</li>
            <li>Open the link on the same device or copy the URL</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            className="w-full"
            loading={resending}
            onClick={handleResend}
            icon={<RefreshCw size={16} />}
          >
            Resend Verification Link
          </Button>

          <Link to="/auth/signin">
            <Button variant="ghost" className="w-full" icon={<ArrowLeft size={16} />}>
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
