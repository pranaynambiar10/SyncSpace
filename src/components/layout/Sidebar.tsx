import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Bell, User, Settings,
  Shield, LogOut, ChevronRight, GraduationCap,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/ui/Logo'
import { initials, avatarColor } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard',   icon: <LayoutDashboard size={18} />, label: 'Dashboard'   },
  { to: '/assignments', icon: <FolderKanban    size={18} />, label: 'Assignments'  },
  { to: '/notifications',icon:<Bell            size={18} />, label: 'Notifications'},
]

export const Sidebar: React.FC = () => {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/signin')
  }

  const name   = profile?.full_name ?? 'Student'
  const email  = profile?.email ?? ''
  const color  = avatarColor(profile?.id ?? name)
  const abbr   = initials(name)

  return (
    <aside className="flex flex-col w-64 min-h-dvh bg-surface-card border-r border-surface-border">
      {/* Logo */}
      <div className="p-6 border-b border-surface-border">
        <Logo size="md" variant="full" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="divider !my-3" />
            <p className="section-label px-3">Admin</p>
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Shield size={18} /> <span>Admin Panel</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-surface-border space-y-1">
        <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <User size={18} /> Profile
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={18} /> Settings
        </NavLink>
        <button
          onClick={handleSignOut}
          className="nav-link w-full text-left text-red-400 hover:text-red-300 hover:bg-red-900/20"
        >
          <LogOut size={18} /> Sign Out
        </button>

        {/* User card */}
        <div className="mt-3 p-3 rounded-xl bg-surface-elevated border border-surface-border flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${color}`}>
            {abbr || <GraduationCap size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{name}</p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
          <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
