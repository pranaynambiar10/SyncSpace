import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Building2, BookOpen, Calendar, ShieldCheck, ArrowRight, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Logo } from '@/components/ui/Logo'
import type { University, Department, Semester } from '@/types'

export default function Onboarding() {
  const { profile, user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [universities, setUniversities] = useState<University[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])

  const [universityId, setUniversityId] = useState(profile?.university_id || '')
  const [departmentId, setDepartmentId] = useState(profile?.department_id || '')
  const [semesterId, setSemesterId] = useState(profile?.semester_id || '')
  const [course, setCourse] = useState(profile?.course || '')
  const [academicYear, setAcademicYear] = useState(profile?.academic_year || '')
  const [registerNumber, setRegisterNumber] = useState(profile?.register_number || '')

  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [uniRes, deptRes, semRes] = await Promise.all([
          supabase.from('universities').select('*').eq('is_active', true).order('name'),
          supabase.from('departments').select('*').eq('is_active', true).order('name'),
          supabase.from('semesters').select('*').eq('is_active', true).order('sort_order'),
        ])

        if (uniRes.data) {
          setUniversities(uniRes.data as University[])
          if (!universityId && uniRes.data.length > 0) {
            setUniversityId(uniRes.data[0].id)
          }
        }
        if (deptRes.data) setDepartments(deptRes.data as Department[])
        if (semRes.data) setSemesters(semRes.data as Semester[])
      } catch (err: unknown) {
        console.error('Failed to load master metadata', err)
      } finally {
        setFetchingData(false)
      }
    }

    loadMasterData()
  }, [])

  const filteredDepartments = departments.filter(
    d => !universityId || d.university_id === universityId
  )
  const filteredSemesters = semesters.filter(
    s => !universityId || s.university_id === universityId
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!departmentId) {
      setError('Please select your department')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          university_id: universityId || null,
          department_id: departmentId || null,
          semester_id: semesterId || null,
          course: course.trim() || null,
          academic_year: academicYear.trim() || null,
          register_number: registerNumber.trim() || null,
          onboarding_done: true,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshProfile()
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save academic profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-surface-base flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center space-y-3">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Complete Your Academic Profile
        </h1>
        <p className="text-sm text-slate-400">
          SyncSpace Campus requires your institutional details to assign project groups and verify coursework.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="card p-6 sm:p-8 space-y-6">
          {error && <Alert variant="danger">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* University Selection */}
            <Select
              id="onboarding-university"
              label="University / Institution"
              value={universityId}
              onChange={e => setUniversityId(e.target.value)}
              disabled={fetchingData}
              options={
                universities.length > 0
                  ? universities.map(u => ({ value: u.id, label: u.name }))
                  : [{ value: '', label: 'Cochin University of Science and Technology (CUSAT)' }]
              }
            />

            {/* Department Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                id="onboarding-department"
                label="Department / School"
                required
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                options={[
                  { value: '', label: 'Select Department...' },
                  ...filteredDepartments.map(d => ({ value: d.id, label: d.name })),
                ]}
              />

              {/* Semester */}
              <Select
                id="onboarding-semester"
                label="Current Semester"
                value={semesterId}
                onChange={e => setSemesterId(e.target.value)}
                options={[
                  { value: '', label: 'Select Semester...' },
                  ...filteredSemesters.map(s => ({ value: s.id, label: s.label })),
                ]}
              />
            </div>

            {/* Course & Academic Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="onboarding-course"
                label="Course / Degree Program"
                placeholder="e.g. B.Tech Computer Science"
                value={course}
                onChange={e => setCourse(e.target.value)}
              />
              <Input
                id="onboarding-year"
                label="Academic Batch / Year"
                placeholder="e.g. 2023 - 2027"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
              />
            </div>

            {/* Register Number with Privacy Notice */}
            <div className="space-y-1.5">
              <Input
                id="onboarding-regno"
                label="University Register / Roll Number"
                placeholder="e.g. CUSAT23CS042"
                value={registerNumber}
                onChange={e => setRegisterNumber(e.target.value)}
                hint="Used strictly for official verification and grade/evaluation mapping."
              />
              <div className="flex items-center gap-1.5 text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                <Lock size={13} className="flex-shrink-0" />
                <span><strong>Privacy Shield:</strong> Your register number and email address are never visible to teammates.</span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              loading={loading}
              icon={<ArrowRight size={16} />}
            >
              Continue to Dashboard
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
