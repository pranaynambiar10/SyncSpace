import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FolderKanban, Plus, KeyRound, Calendar, Users,
  CheckCircle2, Clock, ArrowRight, Shield, ShieldCheck
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { formatDate } from '@/lib/utils'

export interface AssignmentListItem {
  id: string
  title: string
  subject_course: string | null
  status: string
  overall_deadline: string
  max_members: number
  role: 'leader' | 'member'
  member_count: number
  category_name?: string
}

export default function AssignmentsList() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [assignments, setAssignments] = useState<AssignmentListItem[]>([])
  const [loading, setLoading] = useState(true)

  // Join code modal state
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const loadAssignments = async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Fetch user's assignment memberships
      const { data: memberRows, error: mErr } = await supabase
        .from('assignment_members')
        .select(`
          assignment_id,
          role,
          assignments:assignment_id (
            id, title, subject_course, status, overall_deadline, max_members,
            assignment_categories:category_id ( name )
          )
        `)
        .eq('user_id', user.id)

      if (mErr) throw mErr

      if (memberRows) {
        // 2. Fetch member counts for these assignments
        const list: AssignmentListItem[] = []
        for (const row of memberRows as any[]) {
          if (!row.assignments) continue

          const { count } = await supabase
            .from('assignment_members')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', row.assignment_id)

          list.push({
            id: row.assignments.id,
            title: row.assignments.title,
            subject_course: row.assignments.subject_course,
            status: row.assignments.status,
            overall_deadline: row.assignments.overall_deadline,
            max_members: row.assignments.max_members,
            role: row.role,
            member_count: count ?? 1,
            category_name: row.assignments.assignment_categories?.name,
          })
        }
        setAssignments(list)
      }
    } catch (err) {
      console.error('Failed to load assignments', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssignments()
  }, [user])

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = joinCodeInput.trim().toUpperCase()
    if (!clean) return

    setJoining(true)
    setJoinError(null)

    try {
      const { data, error } = await supabase.rpc('join_assignment_by_code', {
        p_code: clean,
      })

      if (error) throw error

      if (data?.success) {
        setShowJoinModal(false)
        navigate(`/assignments/${data.assignment_id}`)
      } else {
        setJoinError(data?.message || 'Invalid join code.')
      }
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join group')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FolderKanban size={26} className="text-brand-400" />
            Group Assignments
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Collaborate on academic coursework, coordinate tasks, and track verified progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowJoinModal(true)}
            icon={<KeyRound size={16} />}
          >
            Enter Join Code
          </Button>
          <Link to="/assignments/new">
            <Button variant="primary" icon={<Plus size={16} />}>
              Create Assignment
            </Button>
          </Link>
        </div>
      </div>

      {/* Assignments Grid */}
      {assignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignments.map(item => (
            <Link
              key={item.id}
              to={`/assignments/${item.id}`}
              className="block group focus:outline-none"
            >
              <Card className="p-6 h-full flex flex-col justify-between hover:border-brand-500/50 transition-all duration-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        item.role === 'leader'
                          ? 'bg-brand-500/10 text-brand-300 border-brand-500/20'
                          : 'bg-surface-elevated text-slate-300 border-surface-border'
                      }`}
                    >
                      {item.role === 'leader' ? '👑 Leader' : 'Team Member'}
                    </span>

                    {item.category_name && (
                      <span className="text-xs text-slate-400 font-medium truncate">
                        {item.category_name}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-2">
                    {item.title}
                  </h3>

                  {item.subject_course && (
                    <p className="text-xs text-slate-400 truncate">
                      {item.subject_course}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-surface-border/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-500" />
                    Due {formatDate(item.overall_deadline)}
                  </span>

                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Users size={13} className="text-slate-500" />
                    {item.member_count} / {item.max_members}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="p-12 text-center border-dashed border-surface-border space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-elevated flex items-center justify-center text-slate-500">
            <FolderKanban size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-white">No assignments found</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You are not a member of any group assignments yet. Create a new assignment for your mini-project or enter a team join code.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowJoinModal(true)}
              icon={<KeyRound size={15} />}
            >
              Join via Code
            </Button>
            <Link to="/assignments/new">
              <Button variant="primary" icon={<Plus size={15} />}>
                Create Assignment
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Join Code Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="card p-6 w-full max-w-md space-y-4 border border-surface-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound size={20} className="text-brand-400" />
                Join Group Assignment
              </h3>
              <button
                onClick={() => {
                  setShowJoinModal(false)
                  setJoinError(null)
                }}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter the unique 8-character invitation code provided by your project leader.
            </p>

            {joinError && <Alert variant="danger">{joinError}</Alert>}

            <form onSubmit={handleJoinByCode} className="space-y-4">
              <input
                type="text"
                placeholder="e.g. SYNC4920"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                className="input text-center text-xl font-mono tracking-widest uppercase font-bold"
                maxLength={10}
                required
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  loading={joining}
                  icon={<ArrowRight size={16} />}
                >
                  Verify & Join
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
