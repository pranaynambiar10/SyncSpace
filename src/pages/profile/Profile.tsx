import React, { useState, useEffect } from 'react'
import {
  User, Mail, Shield, ShieldCheck, Lock, Bell, CheckCircle2,
  Building2, GraduationCap, Calendar, Save, AlertCircle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { initials, avatarColor } from '@/lib/utils'
import type { NotificationPreferences } from '@/types'

export default function Profile() {
  const { profile, user, isAdmin, refreshProfile } = useAuth()

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [course, setCourse] = useState(profile?.course || '')
  const [academicYear, setAcademicYear] = useState(profile?.academic_year || '')
  const [registerNumber, setRegisterNumber] = useState(profile?.register_number || '')

  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [notifs, setNotifs] = useState<Partial<NotificationPreferences>>({
    task_assigned: true,
    deadline_changed: true,
    new_announcement: true,
    submission_received: true,
    submission_approved: true,
    changes_requested: true,
    task_overdue: true,
    member_joined: true,
    reminder_24h: true,
  })
  const [savingNotifs, setSavingNotifs] = useState(false)
  const [notifsMsg, setNotifsMsg] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setCourse(profile.course || '')
      setAcademicYear(profile.academic_year || '')
      setRegisterNumber(profile.register_number || '')
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setNotifs(data as NotificationPreferences)
      })
  }, [user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSavingProfile(true)
    setProfileMsg(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          course: course.trim() || null,
          academic_year: academicYear.trim() || null,
          register_number: registerNumber.trim() || null,
        })
        .eq('id', user.id)

      if (error) throw error
      await refreshProfile()
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err: unknown) {
      setProfileMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleToggleNotif = (key: keyof NotificationPreferences) => {
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSaveNotifs = async () => {
    if (!user) return
    setSavingNotifs(true)
    setNotifsMsg(null)

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...notifs,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
      setNotifsMsg('Notification preferences saved.')
      setTimeout(() => setNotifsMsg(null), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingNotifs(false)
    }
  }

  const name = fullName || profile?.full_name || 'Student'
  const color = avatarColor(user?.id || name)
  const abbr = initials(name)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Account & Academic Profile
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your campus identification details, credentials, and notification settings.
        </p>
      </div>

      {/* Profile Header Badge */}
      <Card className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-lg ${color}`}>
            {abbr || <GraduationCap size={28} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{name}</h2>
              {profile?.verified_student && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck size={12} /> Verified Student
                </span>
              )}
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-2">
              <Mail size={14} className="text-slate-500" />
              {profile?.email}
            </p>
          </div>
        </div>

        {/* Teammate Privacy Assurance Pill */}
        <div className="p-3 rounded-xl bg-surface-elevated/70 border border-surface-border text-xs text-slate-300 max-w-xs space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <Lock size={13} />
            <span>Teammate Privacy Shield</span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Your register number and email address are never exposed to project peers or teammates.
          </p>
        </div>
      </Card>

      {/* Main Edit Form */}
      <Card className="p-6 sm:p-8 space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <User size={18} className="text-brand-400" />
          Academic Information
        </h3>

        {profileMsg && (
          <Alert variant={profileMsg.type === 'success' ? 'success' : 'danger'}>
            {profileMsg.text}
          </Alert>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="profile-name"
              label="Full Name"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
            <div>
              <Input
                id="profile-email"
                label="Registered Institutional / Scholar Email"
                disabled
                value={profile?.email || ''}
                hint="Bound to authentication identity. Non-editable."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="profile-course"
              label="Course / Program"
              value={course}
              onChange={e => setCourse(e.target.value)}
              placeholder="e.g. MCA / B.Tech IT"
            />
            <Input
              id="profile-year"
              label="Academic Batch"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="e.g. 2024-2026"
            />
          </div>

          <div className="space-y-1">
            <Input
              id="profile-regno"
              label="University Register Number"
              value={registerNumber}
              onChange={e => setRegisterNumber(e.target.value)}
              placeholder="e.g. 23MCA104"
              hint="Strictly protected by RLS. Teammates only see your name, avatar, and department."
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={savingProfile}
              icon={<Save size={16} />}
            >
              Save Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bell size={18} className="text-brand-400" />
              In-App Notification Preferences
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Choose which collaborative events generate alerts in your campus inbox.
            </p>
          </div>
          {notifsMsg && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 size={14} /> {notifsMsg}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {[
            { key: 'task_assigned', label: 'When a task is assigned to me' },
            { key: 'submission_received', label: 'When a teammate submits a deliverable (Leader)' },
            { key: 'submission_approved', label: 'When my deliverable is approved' },
            { key: 'changes_requested', label: 'When changes are requested on my submission' },
            { key: 'new_announcement', label: 'New assignment announcements' },
            { key: 'deadline_changed', label: 'When project or task deadline is altered' },
            { key: 'member_joined', label: 'When a new member joins the group' },
            { key: 'reminder_24h', label: '24-hour deadline reminder' },
          ].map(item => (
            <label
              key={item.key}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated/40 border border-surface-border cursor-pointer hover:bg-surface-elevated/80 transition-colors"
            >
              <input
                type="checkbox"
                checked={Boolean(notifs[item.key as keyof NotificationPreferences])}
                onChange={() => handleToggleNotif(item.key as keyof NotificationPreferences)}
                className="w-4 h-4 rounded border-slate-700 bg-surface-base text-brand-500 focus:ring-brand-500/20"
              />
              <span className="text-xs text-slate-300 font-medium">{item.label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="secondary"
            loading={savingNotifs}
            onClick={handleSaveNotifs}
            icon={<Save size={16} />}
          >
            Update Preferences
          </Button>
        </div>
      </Card>
    </div>
  )
}
