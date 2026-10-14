import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  FolderKanban, Users, Calendar, Clock, KeyRound, Copy,
  Check, ArrowLeft, Shield, Lock, CheckCircle2, AlertCircle,
  FileText, Plus, ExternalLink, ChevronRight, Award, UploadCloud,
  FileUp
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { formatDate, initials, avatarColor } from '@/lib/utils'
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal'
import { SubmitDeliverableModal } from '@/components/tasks/SubmitDeliverableModal'
import { ReviewDeliverableModal } from '@/components/tasks/ReviewDeliverableModal'
import type { SubmissionDetails } from '@/components/tasks/ReviewDeliverableModal'

interface MemberInfo {
  id: string
  user_id: string
  role: 'leader' | 'member'
  joined_at: string
  full_name: string
  avatar_url: string | null
  verified_student: boolean
}

export interface TaskItem {
  id: string
  assignment_id: string
  title: string
  description: string | null
  assigned_to: string | null
  assignee_name?: string
  priority: string
  weight: number
  deliverable_type: string
  status: 'todo' | 'in_progress' | 'submitted' | 'under_review' | 'completed' | 'changes_requested'
  deadline: string | null
  current_submission?: SubmissionDetails | null
}

export default function AssignmentDetail() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const { user } = useAuth()

  const [assignment, setAssignment] = useState<any | null>(null)
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [isLeader, setIsLeader] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'files'>('overview')

  // Modals
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [activeSubmitTask, setActiveSubmitTask] = useState<TaskItem | null>(null)
  const [activeReviewSubmission, setActiveReviewSubmission] = useState<{
    submission: SubmissionDetails
    taskTitle: string
  } | null>(null)

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

      const mappedMembers: MemberInfo[] = (mData || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        full_name: m.profiles?.full_name || 'Student Member',
        avatar_url: m.profiles?.avatar_url || null,
        verified_student: m.profiles?.verified_student ?? false,
      }))
      setMembers(mappedMembers)

      // 3. Fetch tasks and submissions
      const { data: tData, error: tErr } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles:assigned_to ( full_name ),
          task_submissions (
            id, task_id, submitted_by, version_number, file_path, file_name,
            written_response, url, review_status, submitted_at, is_current,
            profiles:submitted_by ( full_name )
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: true })

      if (tErr) throw tErr

      if (tData) {
        const mappedTasks: TaskItem[] = tData.map((t: any) => {
          const currentSub = (t.task_submissions || []).find((s: any) => s.is_current) || null
          return {
            id: t.id,
            assignment_id: t.assignment_id,
            title: t.title,
            description: t.description,
            assigned_to: t.assigned_to,
            assignee_name: t.profiles?.full_name || 'Unassigned',
            priority: t.priority,
            weight: t.weight,
            deliverable_type: t.deliverable_type,
            status: t.status,
            deadline: t.deadline,
            current_submission: currentSub
              ? {
                  id: currentSub.id,
                  task_id: currentSub.task_id,
                  submitted_by: currentSub.submitted_by,
                  submitter_name: currentSub.profiles?.full_name || 'Student',
                  version_number: currentSub.version_number,
                  file_path: currentSub.file_path,
                  file_name: currentSub.file_name,
                  written_response: currentSub.written_response,
                  url: currentSub.url,
                  submitted_at: currentSub.submitted_at,
                }
              : null,
          }
        })
        setTasks(mappedTasks)
      }
    } catch (err: unknown) {
      console.error(err)
      setError('You are not an authorized member of this assignment, or it does not exist.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [assignmentId, user])

  // Compute Verified Progress
  const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0)
  const completedWeight = tasks
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.weight, 0)

  // Guard divide by zero: if totalWeight === 0 -> null
  const progressPct =
    totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : null

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

      {/* Header Banner with Verified Progress Engine */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-surface-elevated via-surface-card to-surface-card border border-surface-border space-y-5">
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
                👑 Project Leader
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

        {/* Verified Progress Bar */}
        <div className="p-4 rounded-xl bg-surface-base/80 border border-surface-border space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              Verified Progress Engine
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {progressPct !== null ? `${progressPct}% Verified` : 'No deliverables defined'}
            </span>
          </div>

          {/* Progress track */}
          <div className="w-full bg-surface-elevated h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-500 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct ?? 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {completedWeight} of {totalWeight} total deliverable points approved
            </span>
            <span>
              {tasks.filter(t => t.status === 'completed').length} / {tasks.length} tasks completed
            </span>
          </div>
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
          Team Roster ({members.length})
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
          Tasks & Review Flow ({tasks.length})
        </button>
      </div>

      {/* Tab: Overview & Members */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-brand-400" />
              Active Project Team ({members.length} / {assignment.max_members})
            </h3>

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

            <div className="p-4 rounded-xl bg-surface-elevated/50 border border-surface-border flex items-start gap-3">
              <Lock size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Teammate Privacy Guarantee:</strong> In accordance with SyncSpace Campus policy, register numbers and personal email addresses are never exposed to project teammates.
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Academic Details
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500">Department</span>
                  <p className="text-slate-200 font-medium">{assignment.departments?.name || 'Academic Dept'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Semester</span>
                  <p className="text-slate-200 font-medium">{assignment.semesters?.label || 'Semester'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Capacity</span>
                  <p className="text-slate-200 font-medium">{members.length} / {assignment.max_members} students</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Tasks & Review Flow */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-brand-400" />
                Deliverable Tasks ({tasks.length})
              </h3>
              <p className="text-xs text-slate-400">
                Each task contributes its weighted points to the Verified Progress score upon approval.
              </p>
            </div>

            {isLeader && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCreateTask(true)}
                icon={<Plus size={15} />}
              >
                Add Deliverable Task
              </Button>
            )}
          </div>

          {tasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map(task => {
                const isAssignee = task.assigned_to === user?.id
                const isUnderReview = task.status === 'under_review'

                let statusBadge = (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    To Do
                  </span>
                )
                if (task.status === 'under_review') {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
                      Under Review
                    </span>
                  )
                } else if (task.status === 'completed') {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Completed
                    </span>
                  )
                } else if (task.status === 'changes_requested') {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                      Changes Requested
                    </span>
                  )
                }

                return (
                  <Card key={task.id} className="p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                          {task.weight} Points
                        </span>
                        {statusBadge}
                      </div>

                      <h4 className="text-base font-bold text-white line-clamp-2">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-surface-border/60 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Assignee</span>
                        <span className="text-slate-300 font-medium truncate block max-w-[140px]">
                          {task.assignee_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Member submit button */}
                        {task.status !== 'completed' && (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => setActiveSubmitTask(task)}
                            icon={<FileUp size={13} />}
                          >
                            Submit
                          </Button>
                        )}

                        {/* Leader review button when under review */}
                        {isLeader && isUnderReview && task.current_submission && (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() =>
                              setActiveReviewSubmission({
                                submission: task.current_submission!,
                                taskTitle: task.title,
                              })
                            }
                            icon={<CheckCircle2 size={13} />}
                          >
                            Evaluate
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="p-12 text-center border-dashed border-surface-border space-y-3">
              <CheckCircle2 size={32} className="mx-auto text-slate-600" />
              <h3 className="text-base font-bold text-white">No tasks created yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isLeader
                  ? 'As project leader, create weighted deliverable tasks and assign them to your team.'
                  : 'Your project leader has not created deliverable tasks for this assignment yet.'}
              </p>
              {isLeader && (
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCreateTask(true)}
                    icon={<Plus size={14} />}
                  >
                    Add First Task
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateTaskModal
        assignmentId={assignment.id}
        members={members.map(m => ({ user_id: m.user_id, full_name: m.full_name }))}
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onTaskCreated={loadData}
      />

      {activeSubmitTask && (
        <SubmitDeliverableModal
          assignmentId={assignment.id}
          taskId={activeSubmitTask.id}
          taskTitle={activeSubmitTask.title}
          deliverableType={activeSubmitTask.deliverable_type}
          isOpen={true}
          onClose={() => setActiveSubmitTask(null)}
          onSubmitSuccess={loadData}
        />
      )}

      {activeReviewSubmission && (
        <ReviewDeliverableModal
          submission={activeReviewSubmission.submission}
          taskTitle={activeReviewSubmission.taskTitle}
          isOpen={true}
          onClose={() => setActiveReviewSubmission(null)}
          onReviewCompleted={loadData}
        />
      )}
    </div>
  )
}
