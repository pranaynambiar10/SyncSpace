import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

export const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-surface-base">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-72 animate-slide-down">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface-card border-b border-surface-border sticky top-0 z-40">
          <Logo size="sm" variant="full" />
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-surface-elevated transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
