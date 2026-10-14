import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  FolderKanban, Users, Calendar, Clock, KeyRound, Copy,
  Check, ArrowLeft, Shield, Lock, CheckCircle2, AlertCircle,
  FileText, Plus, ExternalLink
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { formatDate, initials, avatarColor } from '@/lib/utils'

interface MemberInfo {
  id: string
  user_id: string
  role: 'leader' | 'member'
  joined_at: string
  full_name: string
  avatar_url: string | null
  verified_student: boolean
}

export default function AssignmentDetail() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const { user } = useAuth()

  const [assignment, setAssignment] = useState<any | null>(null)
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [isLeader, setIsLeader] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'files'>('overview')

  const loadData = async () => {
    if (!assignmentId || !user) return
    setLoading(true)
    setError(null)

    try {
      // 1. Fetch assignment details (RLS enforces user must be a member or admin)
      const { data: assignData, error: aErr } = await supabase
        .from('assignments')
        .select(`
          *,
          assignment_categories:category_id ( name ),
          departments:department_id ( name ),
          semesters:semester_id ( label )
        `)
        .eq('id', assignmentId)
        .single()

      if (aErr) throw aErr
      setAssignment(assignData)
      setIsLeader(assignData.leader_id === user.id)

      // 2. Fetch members of this assignment using profile_basics (excludes email & reg number)
      const { data: mData, error: mErr } = await supabase
        .from('assignment_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            verified_student
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('joined_at', { ascending: true })

      if (mErr) throw mErr

      if (mData) {
        setMembers(
          mData.map((m: any) => ({
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            joined_at: m.joined_at,
            full_name: m.profiles?.full_name || 'Student Member',
            avatar_url: m.profiles?.avatar_url || null,
            verified_student: m.profiles?.verified_student ?? false,
          }))
        )
      }
    } catch (err: unknown) {
      console.error(err)
      setError('You are not a member of this assignment, or it does not exist.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [assignmentId, user])

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <span className="spinner w-8 h-8 text-brand-500" />
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertCircle size={30} />
        </div>
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          {error || 'This assignment is private to enrolled group members.'}
        </p>
        <Link to="/assignments">
          <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />}>
            Back to Assignments
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top back navigation */}
      <div className="flex items-center justify-between pb-2">
        <Link
          to="/assignments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to Assignments
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-surface-elevated via-surface-card to-surface-card border border-surface-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20">
              {assignment.assignment_categories?.name || 'Group Project'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ● Active
            </span>
            {isLeader && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                👑 You are the Leader
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-500" />
              Deadline: <strong className="text-slate-200">{formatDate(assignment.overall_deadline)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-slate-500" />
              {members.length} / {assignment.max_members} members
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {assignment.title}
          </h1>
          {assignment.subject_course && (
            <p className="text-sm text-brand-400 mt-1 font-medium">
              {assignment.subject_course}
            </p>
          )}
          {assignment.description && (
            <p className="text-xs text-slate-400 mt-2 max-w-3xl leading-relaxed">
              {assignment.description}
            </p>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-brand-500 text-brand-400 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users size={16} />
          Team Members ({members.length})
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'tasks'
              ? 'border-brand-500 text-brand-400 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 size={16} />
          Tasks & Review Flow (Phase 4)
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'files'
              ? 'border-brand-500 text-brand-400 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText size={16} />
          Deliverables (Phase 5)
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members List (Left 2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-brand-400" />
                Team Roster ({members.length} / {assignment.max_members})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {members.map(m => {
                const color = avatarColor(m.user_id + m.full_name)
                const abbr = initials(m.full_name)
                return (
                  <Card key={m.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${color}`}>
                        {abbr}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-200 truncate">
                            {m.full_name}
                          </p>
                          {m.user_id === user?.id && (
                            <span className="text-[10px] text-brand-400 bg-brand-500/10 px-1.5 py-0.2 rounded font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          Joined {formatDate(m.joined_at)}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                        m.role === 'leader'
                          ? 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
                          : 'bg-surface-elevated text-slate-400 border border-surface-border'
                      }`}
                    >
                      {m.role === 'leader' ? 'Leader' : 'Member'}
                    </span>
                  </Card>
                )
              })}
            </div>

            {/* Privacy Shield Banner */}
            <div className="p-4 rounded-xl bg-surface-elevated/50 border border-surface-border flex items-start gap-3">
              <Lock size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Teammate Privacy Guarantee:</strong> In accordance with SyncSpace Campus policy, register numbers and personal email addresses are never exposed to project teammates.
              </div>
            </div>
          </div>

          {/* Right Column: Project Meta & Leader Actions */}
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Project Information
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500">Department</span>
                  <p className="text-slate-200 font-medium">{assignment.departments?.name || 'Department'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Semester</span>
                  <p className="text-slate-200 font-medium">{assignment.semesters?.label || 'Semester'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Group Capacity</span>
                  <p className="text-slate-200 font-medium">
                    {members.length} / {assignment.max_members} students
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-brand-950/40 via-surface-card to-surface-card border-brand-500/20 space-y-2">
              <div className="flex items-center gap-2 text-brand-300 font-semibold text-xs">
                <Shield size={14} />
                <span>Next Workflow: Task Engine</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Phase 4 Task Assignments & Leader Review will allow the leader to create tasks with weighted points, assign contributors, and review deliverable uploads.
              </p>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <Card className="p-12 text-center border-dashed border-surface-border space-y-3">
          <CheckCircle2 size={32} className="mx-auto text-brand-400" />
          <h3 className="text-lg font-bold text-white">Task Management & Review Loop</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Ready for Phase 4: Deliverables, task weights, status machine, and submitter ≠ reviewer enforcement.
          </p>
        </Card>
      )}

      {activeTab === 'files' && (
        <Card className="p-12 text-center border-dashed border-surface-border space-y-3">
          <FileText size={32} className="mx-auto text-brand-400" />
          <h3 className="text-lg font-bold text-white">Deliverable Cloud Storage</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Ready for Phase 5: Storage policies isolating assignment files to enrolled members only.
          </p>
        </Card>
      )}
    </div>
  )
}
