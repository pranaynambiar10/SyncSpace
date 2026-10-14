import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?:    boolean
  elevated?: boolean
  noPad?:    boolean
}

export const Card: React.FC<CardProps> = ({
  glass = false,
  elevated = false,
  noPad = false,
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'rounded-2xl border',
      glass
        ? 'glass'
        : elevated
        ? 'bg-surface-elevated border-surface-border shadow-card'
        : 'bg-surface-card border-surface-border shadow-card',
      !noPad && 'p-6',
      className,
    )}
    {...props}
  >
    {children}
  </div>
)

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('mb-5', className)} {...props} />
)

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...props }) => (
  <h2 className={cn('text-lg font-semibold text-slate-100', className)} {...props}>
    {children}
  </h2>
)

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn('text-sm text-slate-400 mt-1', className)} {...props} />
)

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('mt-5 pt-5 border-t border-surface-border flex items-center gap-3', className)} {...props} />
)
