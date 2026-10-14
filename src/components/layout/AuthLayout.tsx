/**
 * AuthLayout — split-screen layout for all auth pages.
 * Left: brand panel with gradient, decorative orbit animation, taglines.
 * Right: form panel.
 */
import React from 'react'
import { Logo } from '@/components/ui/Logo'

interface AuthLayoutProps {
  children: React.ReactNode
  /** Override the default tagline shown on the left panel */
  tagline?: string
}

const FEATURES = [
  { icon: '✓', text: 'Verified Progress — tasks complete only when approved' },
  { icon: '✓', text: 'Cloud documents, version history, team analytics' },
  { icon: '✓', text: 'Deadline reminders, risk alerts, peer feedback' },
]

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  tagline = 'Academic collaboration for university students',
}) => (
  <div className="min-h-dvh flex bg-surface-base">
    {/* ── Left panel — brand ── */}
    <div
      className="hidden lg:flex lg:w-[42%] xl:w-[45%] relative flex-col justify-between
                 p-10 xl:p-14 overflow-hidden"
      style={{
        background:
          'linear-gradient(145deg, #060d24 0%, #0b1535 40%, #0f1d45 70%, #14245a 100%)',
      }}
    >
      {/* Glow blobs */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #6366f1, transparent 70%)' }} />
        <div className="absolute bottom-[-5%] right-[-5%] w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(ellipse, #8b5cf6, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #6366f1, transparent 60%)' }} />
      </div>

      {/* Decorative orbit SVG */}
      <div className="absolute top-1/2 right-[-80px] -translate-y-1/2 opacity-[0.08] pointer-events-none" aria-hidden="true">
        <svg width="400" height="400" viewBox="0 0 400 400" fill="none">
          <circle cx="200" cy="200" r="180" stroke="#6366f1" strokeWidth="1" />
          <circle cx="200" cy="200" r="130" stroke="#8b5cf6" strokeWidth="1" />
          <circle cx="200" cy="200" r="80"  stroke="#6366f1" strokeWidth="1" />
          <circle cx="200" cy="200" r="30"  fill="#6366f1" />
          <circle cx="20"  cy="200" r="8"   fill="#818cf8" />
          <circle cx="380" cy="200" r="8"   fill="#818cf8" />
          <circle cx="200" cy="20"  r="8"   fill="#a78bfa" />
          <circle cx="200" cy="380" r="8"   fill="#a78bfa" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Logo size="lg" variant="full" />
      </div>

      <div className="relative z-10 max-w-sm">
        <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
          {tagline}
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Replace scattered WhatsApp threads and local files with one
          centralized cloud workspace. CUSAT-ready, built for every department.
        </p>
        <ul className="space-y-3">
          {FEATURES.map(f => (
            <li key={f.text} className="flex items-start gap-3 text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-600/20 border border-brand-500/40
                               flex items-center justify-center text-brand-400 text-xs font-bold mt-0.5">
                {f.icon}
              </span>
              <span className="text-slate-300">{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10">
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} SyncSpace Campus — Built for CUSAT and beyond
        </p>
      </div>
    </div>

    {/* ── Right panel — form ── */}
    <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
      {/* Mobile logo */}
      <div className="absolute top-6 left-6 lg:hidden">
        <Logo size="sm" variant="full" />
      </div>
      <div className="w-full max-w-md animate-slide-up">
        {children}
      </div>
    </div>
  </div>
)
