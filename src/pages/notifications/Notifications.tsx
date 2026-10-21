import React, { useState } from 'react'
import {
  Bell, CheckCircle2, Clock, FileText, Megaphone,
  UserPlus, AlertTriangle, Award, Trash2, BellOff
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Notification {
  id: string
  type: 'task_assigned' | 'submission_approved' | 'changes_requested' | 'member_joined' | 'deadline_reminder' | 'announcement' | 'achievement'
  title: string
  body: string
  time: string
  read: boolean
  href?: string
}

// Mock notifications until a real notifications table is implemented
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'submission_approved',
    title: 'Deliverable Approved ✓',
    body: 'Your submission for "Chapter 3: System Architecture" has been approved by the project leader.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    type: 'task_assigned',
    title: 'New Task Assigned',
    body: 'You have been assigned to "Module 2: Database Normalization" in Advanced DBMS Project.',
    time: '5 hours ago',
    read: false,
  },
  {
    id: '3',
    type: 'member_joined',
    title: 'New Team Member',
    body: 'Rahul Menon joined your group assignment "Cloud Architecture Implementation".',
    time: '1 day ago',
    read: true,
  },
  {
    id: '4',
    type: 'changes_requested',
    title: 'Changes Requested',
    body: 'Your project leader has requested revisions on "Research Methodology Document". Please address the feedback.',
    time: '1 day ago',
    read: true,
  },
  {
    id: '5',
    type: 'deadline_reminder',
    title: 'Deadline in 24 Hours',
    body: 'Your group assignment "Mini-Project: Campus App" is due tomorrow at 11:59 PM.',
    time: '1 day ago',
    read: true,
  },
  {
    id: '6',
    type: 'announcement',
    title: 'Project Announcement',
    body: 'Leader: "Team — the final presentation is scheduled for next Friday. Please ensure all deliverables are submitted by Wednesday."',
    time: '2 days ago',
    read: true,
  },
  {
    id: '7',
    type: 'achievement',
    title: 'Achievement Unlocked 🎉',
    body: 'You\'ve completed your first peer-verified deliverable on SyncSpace Campus!',
    time: '3 days ago',
    read: true,
  },
]

const ICON_MAP: Record<Notification['type'], { icon: React.ReactNode; colorClass: string; bgClass: string }> = {
  task_assigned:      { icon: <FileText size={18} />,      colorClass: 'text-brand-400',   bgClass: 'bg-brand-500/10 border-brand-500/20' },
  submission_approved:{ icon: <CheckCircle2 size={18} />,  colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/20' },
  changes_requested:  { icon: <AlertTriangle size={18} />, colorClass: 'text-red-400',     bgClass: 'bg-red-500/10 border-red-500/20' },
  member_joined:      { icon: <UserPlus size={18} />,      colorClass: 'text-violet-400',  bgClass: 'bg-violet-500/10 border-violet-500/20' },
  deadline_reminder:  { icon: <Clock size={18} />,         colorClass: 'text-amber-400',   bgClass: 'bg-amber-500/10 border-amber-500/20' },
  announcement:       { icon: <Megaphone size={18} />,     colorClass: 'text-amber-400',   bgClass: 'bg-amber-500/10 border-amber-500/20' },
  achievement:        { icon: <Award size={18} />,         colorClass: 'text-violet-400',  bgClass: 'bg-violet-500/10 border-violet-500/20' },
}

export default function Notifications() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleMarkRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const displayed = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-brand-500 text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Activity alerts for your assignments, tasks, and team events.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            icon={<CheckCircle2 size={14} />}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border">
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            filter === 'all'
              ? 'border-brand-500 text-brand-400 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell size={16} />
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            filter === 'unread'
              ? 'border-brand-500 text-brand-400 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {displayed.length > 0 ? (
        <div className="space-y-3">
          {displayed.map(notif => {
            const { icon, colorClass, bgClass } = ICON_MAP[notif.type]
            return (
              <div
                key={notif.id}
                onClick={() => handleMarkRead(notif.id)}
                className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${
                  notif.read
                    ? 'bg-surface-card border-surface-border hover:bg-surface-elevated/50'
                    : 'bg-surface-card border-brand-500/20 shadow-brand-sm/30 hover:border-brand-500/40'
                }`}
              >
                {/* Unread indicator dot */}
                {!notif.read && (
                  <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                )}

                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${bgClass} ${colorClass}`}>
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-sm font-semibold ${notif.read ? 'text-slate-300' : 'text-white'}`}>
                      {notif.title}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {notif.body}
                  </p>
                  <span className="text-[11px] text-slate-600 mt-1.5 block">
                    {notif.time}
                  </span>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={e => { e.stopPropagation(); handleDismiss(notif.id) }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-surface-elevated opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Dismiss"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <Card className="p-12 text-center border-dashed border-surface-border space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-elevated flex items-center justify-center text-slate-600">
            <BellOff size={30} />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {filter === 'unread'
                ? 'You have no unread notifications. Great work staying on top of things.'
                : 'Notifications from your assignments, deliverable reviews, and team activity will appear here.'}
            </p>
          </div>
          {filter === 'unread' && (
            <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>
              View all notifications
            </Button>
          )}
        </Card>
      )}
    </div>
  )
}
