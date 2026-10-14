import React from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:   string
  error?:   string | null
  hint?:    string
  id:       string
  options:  { value: string; label: string }[]
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, id, options, placeholder, className, ...props }, ref) => (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          'w-full bg-surface-elevated border rounded-xl px-4 py-3 text-sm text-slate-100',
          'transition-all duration-200 focus:outline-none focus:ring-1 appearance-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/30'
            : 'border-surface-border2 focus:border-brand-500 focus:ring-brand-500/30',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-surface-elevated">
            {o.label}
          </option>
        ))}
      </select>
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  ),
)
Select.displayName = 'Select'
