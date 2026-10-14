import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export const AppLayout: React.FC = () => (
  <div className="flex min-h-dvh bg-surface-base">
    {/* Desktop sidebar */}
    <div className="hidden md:flex">
      <Sidebar />
    </div>

    {/* Main content */}
    <main className="flex-1 flex flex-col min-w-0">
      {/* TODO Phase 7: mobile top bar / hamburger */}
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto animate-fade-in">
        <Outlet />
      </div>
    </main>
  </div>
)
