/** SyncSpace Campus — SVG logo mark + wordmark */
import React from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?:      'sm' | 'md' | 'lg' | 'xl'
  variant?:   'full' | 'icon'
  className?: string
  animate?:   boolean
}

const sizes = {
  sm: { icon: 24, text: 'text-base' },
  md: { icon: 32, text: 'text-lg'   },
  lg: { icon: 40, text: 'text-xl'   },
  xl: { icon: 52, text: 'text-2xl'  },
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'full',
  className,
  animate = false,
}) => {
  const { icon: s, text } = sizes[size]

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Icon mark: two overlapping orbit rings + centre dot */}
      <svg
        width={s}
        height={s}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={animate ? 'animate-pulse-brand' : ''}
      >
        <defs>
          <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="brand-grad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        {/* Outer ring */}
        <circle cx="20" cy="20" r="18" stroke="url(#brand-grad)" strokeWidth="2" opacity="0.5" />
        {/* Inner orbit 1 */}
        <ellipse cx="20" cy="20" rx="12" ry="6" stroke="url(#brand-grad)" strokeWidth="2"
          transform="rotate(-30 20 20)" />
        {/* Inner orbit 2 */}
        <ellipse cx="20" cy="20" rx="12" ry="6" stroke="url(#brand-grad2)" strokeWidth="2"
          transform="rotate(30 20 20)" opacity="0.7" />
        {/* Centre node */}
        <circle cx="20" cy="20" r="4" fill="url(#brand-grad)" />
        {/* Orbit node dots */}
        <circle cx="8"  cy="20" r="2" fill="#818cf8" opacity="0.9" />
        <circle cx="32" cy="20" r="2" fill="#818cf8" opacity="0.9" />
        <circle cx="20" cy="8"  r="2" fill="#a78bfa" opacity="0.7" />
        <circle cx="20" cy="32" r="2" fill="#a78bfa" opacity="0.7" />
      </svg>

      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-bold tracking-tight text-gradient', text)}>
            SyncSpace
          </span>
          <span className={cn('font-medium text-slate-400 tracking-wider', size === 'xl' ? 'text-sm' : 'text-xs')}>
            CAMPUS
          </span>
        </div>
      )}
    </div>
  )
}
