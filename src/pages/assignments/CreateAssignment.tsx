import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  FolderPlus, ArrowLeft, Calendar, Users, CheckCircle2,
  AlertCircle, KeyRound, Copy, Check, ArrowRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import type { Department, Semester } from '@/types'

export interface Category {
  id: string
  name: string
  slug: string
}

export default function CreateAssignment() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [departmentId, setDepartmentId] = useState(profile?.department_id || '')
  const [semesterId, setSemesterId] = useState(profile?.semester_id || '')
  const [subjectCourse, setSubjectCourse] = useState('')
  const [description, setDescription] = useState('')
  const [overallDeadline, setOverallDeadline] = useState('')
  const [maxMembers, setMaxMembers] = useState(10)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Success state with generated join code
  const [createdInfo, setCreatedInfo] = useState<{
    assignmentId: string
    joinCode: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('assignment_categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('departments').select('*').eq('is_active', true).order('name'),
      supabase.from('semesters').select('*').eq('is_active', true).order('sort_order'),
    ]).then(([catRes, deptRes, semRes]) => {
      if (catRes.data) {
        setCategories(catRes.data as Category[])
        if (catRes.data.length > 0) setCategoryId(catRes.data[0].id)
      }
      if (deptRes.data) {
        setDepartments(deptRes.data as Department[])
        if (!departmentId && deptRes.data.length > 0) setDepartmentId(deptRes.data[0].id)
      }
      if (semRes.data) {
        setSemesters(semRes.data as Semester[])
        if (!semesterId && semRes.data.length > 0) setSemesterId(semRes.data[0].id)
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!title.trim()) {
      setError('Please provide an assignment title.')
      return
    }

    if (!overallDeadline) {
      setError('Please specify the overall submission deadline.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('create_new_assignment', {
        p_title: title.trim(),
        p_category_id: categoryId || null,
        p_department_id: departmentId || null,
        p_semester_id: semesterId || null,
        p_subject_course: subjectCourse.trim() || null,
        p_description: description.trim() || null,
        p_overall_deadline: new Date(overallDeadline).toISOString(),
        p_max_members: Number(maxMembers) || 10,
      })

      if (rpcError) throw rpcError

      setCreatedInfo({
        assignmentId: data.assignment_id,
        joinCode: data.join_code,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyCode = () => {
    if (createdInfo?.joinCode) {
      navigator.clipboard.writeText(createdInfo.joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // If successfully created, display Join Code card before redirect
  if (createdInfo) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 space-y-6 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle2 size={32} />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">Assignment Created!</h2>
          <p className="text-sm text-slate-400">
            You are set as the Project Leader. Share this invitation code with your teammates.
          </p>
        </div>

        <Card className="p-6 space-y-4 bg-surface-elevated/70 border-brand-500/30">
          <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
            Team Invitation Join Code
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl font-extrabold text-brand-300 tracking-widest bg-surface-base px-6 py-3 rounded-xl border border-surface-border select-all">
              {createdInfo.joinCode}
            </span>
            <Button
              variant="secondary"
              onClick={handleCopyCode}
              icon={copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Valid for 7 days. Maximum group size: 10 students.
          </p>
        </Card>

        <div className="flex justify-center gap-3 pt-2">
          <Button
            variant="primary"
            onClick={() => navigate(`/assignments/${createdInfo.assignmentId}`)}
            icon={<ArrowRight size={16} />}
          >
            Open Project Workspace
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Top back navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <Link
          to="/assignments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to Assignments
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <FolderPlus size={26} className="text-brand-400" />
          Create New Group Assignment
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Set up project deliverables, deadlines, and automatically generate team join codes.
        </p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <Input
            id="assign-title"
            label="Assignment / Project Title"
            placeholder="e.g. Distributed Cloud Database Implementation"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          {/* Category & Course */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="assign-category"
              label="Academic Category"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
            />

            <Input
              id="assign-course"
              label="Subject / Course Code"
              placeholder="e.g. CAS 2101 - Advanced Database"
              value={subjectCourse}
              onChange={e => setSubjectCourse(e.target.value)}
            />
          </div>

          {/* Department & Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="assign-dept"
              label="Department"
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              options={departments.map(d => ({ value: d.id, label: d.name }))}
            />

            <Select
              id="assign-sem"
              label="Semester"
              value={semesterId}
              onChange={e => setSemesterId(e.target.value)}
              options={semesters.map(s => ({ value: s.id, label: s.label }))}
            />
          </div>

          {/* Deadline & Max Members */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="assign-deadline"
              type="datetime-local"
              label="Overall Project Deadline"
              required
              value={overallDeadline}
              onChange={e => setOverallDeadline(e.target.value)}
            />

            <Input
              id="assign-max"
              type="number"
              min={2}
              max={10}
              label="Max Team Members (Limit 10)"
              value={maxMembers}
              onChange={e => setMaxMembers(Number(e.target.value))}
              hint="CUSAT mini-project default: 10 students"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Project Brief & Instructions
            </label>
            <textarea
              rows={4}
              placeholder="Outline project objectives, expected deliverables, and evaluation criteria..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="textarea w-full text-xs"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 flex justify-end gap-3 border-t border-surface-border">
            <Link to="/assignments">
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              icon={<FolderPlus size={16} />}
            >
              Create Assignment & Generate Join Code
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
