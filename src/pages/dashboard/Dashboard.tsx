import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderKanban, Plus, KeyRound, Award, CheckCircle2,
  Clock, ShieldCheck, Sparkles, AlertCircle, ArrowUpRight, GraduationCap
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCodeInput, setJoinCodeInput] = useState('')

  const fullName = profile?.full_name || 'Student'
  const department = profile?.department_id ? 'Department of Computer Applications' : 'Academic Department'
  const isVerifiedStudent = profile?.verified_student ?? true

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {fullName}
            </h1>
            {isVerifiedStudent && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck size={13} />
                Verified Student
              </span>
            )}
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                Admin
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {profile?.course || 'Campus Scholar'} • {profile?.academic_year || 'Academic Year'}
          </p>
        </div>

        {/* Quick Action CTAs */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowJoinModal(true)}
            icon={<KeyRound size={16} />}
          >
            Enter Join Code
          </Button>
          <Link to="/assignments/new">
            <Button
              variant="primary"
              icon={<Plus size={16} />}
            >
              New Assignment
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Assignments</p>
            <h3 className="text-2xl font-bold text-white mt-1">0</h3>
            <span className="text-xs text-slate-500">In-progress group projects</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <FolderKanban size={22} />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Submissions</p>
            <h3 className="text-2xl font-bold text-white mt-1">0</h3>
            <span className="text-xs text-slate-500">Awaiting leader review</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock size={22} />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Verified Progress</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">--%</h3>
            <span className="text-xs text-slate-500">Weighted deliverables</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={22} />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Achievements Unlocked</p>
            <h3 className="text-2xl font-bold text-violet-400 mt-1">0</h3>
            <span className="text-xs text-slate-500">Peer & Leader awards</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Award size={22} />
          </div>
        </Card>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Assignments Overview */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderKanban size={20} className="text-brand-400" />
                Current Assignments
              </h2>
              <Link to="/assignments" className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1">
                View All <ArrowUpRight size={13} />
              </Link>
            </div>

            {/* Empty State */}
            <div className="py-12 px-4 rounded-xl border border-dashed border-surface-border text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-elevated flex items-center justify-center text-slate-500">
                <FolderKanban size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-semibold text-slate-200">No active assignments yet</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Start your collaborative semester project or enter an invitation join code from your team leader.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Link to="/assignments/new">
                  <Button variant="primary" size="sm" icon={<Plus size={14} />}>
                    Create Assignment
                  </Button>
                </Link>
                <Button variant="secondary" size="sm" onClick={() => setShowJoinModal(true)} icon={<KeyRound size={14} />}>
                  Join via Code
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Campus Identity & Quick Guidance */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <GraduationCap size={18} className="text-brand-400" />
              Institutional Identity
            </h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-surface-elevated/60 border border-surface-border space-y-1">
                <span className="text-xs text-slate-400">Institutional Email</span>
                <p className="font-medium text-slate-200 truncate">{profile?.email || 'student@domain.edu'}</p>
                <span className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 size={12} /> Domain Verified
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-elevated/60 border border-surface-border space-y-1">
                <span className="text-xs text-slate-400">Campus Status</span>
                <p className="font-medium text-slate-200">Active Academic Member</p>
                <span className="text-xs text-slate-400">Max Group Size: 10 students</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-brand-950/40 via-surface-card to-surface-card border-brand-500/20">
            <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm mb-2">
              <Sparkles size={16} />
              <span>Verified Progress Framework</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Progress on SyncSpace Campus is mathematically weighted by approved deliverables. No arbitrary percentages or self-reported milestones.
            </p>
          </Card>
        </div>
      </div>

      {/* Join Code Modal Placeholder */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="card p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound size={20} className="text-brand-400" />
                Join Assignment
              </h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Enter the unique 8-character invitation code provided by your group leader.
            </p>
            <input
              type="text"
              placeholder="e.g. SYNC-7492"
              value={joinCodeInput}
              onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
              className="input text-center text-lg font-mono tracking-widest uppercase"
              maxLength={12}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowJoinModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  alert('Join code validation will execute against assignment_join_codes (Phase 2).')
                  setShowJoinModal(false)
                }}
              >
                Verify & Join
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
