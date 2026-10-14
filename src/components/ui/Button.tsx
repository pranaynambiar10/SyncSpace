import React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
type Size    = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  icon?:     React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  danger:    'btn-danger',
  link:      'btn text-brand-400 hover:text-brand-300 underline-offset-4 hover:underline p-0 h-auto',
}

const sizeClasses: Record<Size, string> = {
  xs: 'h-7  px-3  text-xs  gap-1.5',
  sm: 'h-9  px-4  text-sm  gap-1.5',
  md: 'h-11 px-5  text-sm  gap-2',
  lg: 'h-12 px-6  text-base gap-2',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant  = 'primary',
      size     = 'md',
      loading  = false,
      icon,
      iconRight,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          'select-none',
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className={cn('spinner', size === 'xs' || size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
        {!loading && iconRight && <span className="flex-shrink-0 ml-auto">{iconRight}</span>}
      </button>
    )
  },
)
Button.displayName = 'Button'
