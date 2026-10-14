import React, { useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:      string
  error?:      string | null
  hint?:       string
  success?:    string | null
  icon?:       React.ReactNode
  /** Wrap in a labelled field group */
  id:          string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, success, icon, className, type, id, ...props }, ref) => {
    const [showPwd, setShowPwd] = useState(false)
    const isPassword = type === 'password'
    const actualType = isPassword ? (showPwd ? 'text' : 'password') : type

    const borderCls = error
      ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/30'
      : success
      ? 'border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500/30'
      : 'border-surface-border2 focus:border-brand-500 focus:ring-brand-500/30'

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            type={actualType}
            className={cn(
              'w-full bg-surface-elevated border rounded-xl py-3 text-sm text-slate-100',
              'placeholder-slate-500 transition-all duration-200',
              'focus:outline-none focus:ring-1',
              borderCls,
              icon ? 'pl-10 pr-4' : 'px-4',
              isPassword && 'pr-11',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={showPwd ? 'Hide password' : 'Show password'}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {!isPassword && error && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none">
              <AlertCircle size={16} />
            </span>
          )}
          {!isPassword && success && !error && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none">
              <CheckCircle2 size={16} />
            </span>
          )}
        </div>
        {error && (
          <p id={`${id}-error`} role="alert" className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle size={12} /> {error}
          </p>
        )}
        {success && !error && (
          <p className="text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> {success}
          </p>
        )}
        {hint && !error && !success && (
          <p className="text-xs text-slate-500">{hint}</p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'
