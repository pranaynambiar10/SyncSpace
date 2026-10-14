import React from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertProps {
  variant?:   AlertVariant
  title?:     string
  children:   React.ReactNode
  onDismiss?: () => void
  className?: string
}

const config: Record<AlertVariant, { icon: React.ReactNode; cls: string; titleCls: string; textCls: string }> = {
  info:    { icon: <Info size={16} />,          cls: 'bg-brand-950/60 border-brand-800/50',   titleCls: 'text-brand-300',   textCls: 'text-brand-400' },
  success: { icon: <CheckCircle2 size={16} />,  cls: 'bg-emerald-950/60 border-emerald-800/50', titleCls: 'text-emerald-300', textCls: 'text-emerald-400' },
  warning: { icon: <AlertTriangle size={16} />, cls: 'bg-amber-950/60 border-amber-800/50',   titleCls: 'text-amber-300',   textCls: 'text-amber-400' },
  error:   { icon: <AlertCircle size={16} />,   cls: 'bg-red-950/60 border-red-800/50',       titleCls: 'text-red-300',     textCls: 'text-red-400' },
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  className,
}) => {
  const { icon, cls, titleCls, textCls } = config[variant]
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-xl border p-4 text-sm animate-slide-down',
        cls,
        className,
      )}
    >
      <span className={cn('flex-shrink-0 mt-0.5', titleCls)}>{icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className={cn('font-semibold mb-0.5', titleCls)}>{title}</p>}
        <div className={textCls}>{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn('flex-shrink-0 hover:opacity-70 transition-opacity', titleCls)}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
