import React, { useState, useEffect } from 'react'
import {
  UploadCloud, FileUp, X, CheckCircle2, AlertCircle,
  BookOpen, Layers, Building2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import type { Department, Semester, Subject, SubjectModule } from '@/types'

interface UploadNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onNoteUploaded: () => void
}

export const UploadNoteModal: React.FC<UploadNoteModalProps> = ({
  isOpen,
  onClose,
  onNoteUploaded,
}) => {
  const { user, profile } = useAuth()

  const [departments, setDepartments] = useState<Department[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [modules, setModules] = useState<SubjectModule[]>([])

  const [selectedDeptId, setSelectedDeptId] = useState(profile?.department_id || '')
  const [selectedSemId, setSelectedSemId] = useState(profile?.semester_id || '')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load departments and semesters
  useEffect(() => {
    if (!isOpen) return

    Promise.all([
      supabase.from('departments').select('*').eq('is_active', true).order('name'),
      supabase.from('semesters').select('*').eq('is_active', true).order('sort_order'),
    ]).then(([deptRes, semRes]) => {
      if (deptRes.data) {
        setDepartments(deptRes.data as Department[])
        if (!selectedDeptId && deptRes.data.length > 0) {
          setSelectedDeptId(deptRes.data[0].id)
        }
      }
      if (semRes.data) {
        const uniqueSemesters = (semRes.data as Semester[]).filter(
          (s, idx, arr) => arr.findIndex(item => item.sort_order === s.sort_order || item.label === s.label) === idx
        )
        setSemesters(uniqueSemesters)
        if (!selectedSemId && uniqueSemesters.length > 0) {
          setSelectedSemId(uniqueSemesters[0].id)
        }
      }
    })
  }, [isOpen])

  // Load subjects filtered by department
  useEffect(() => {
    if (!selectedDeptId) return

    supabase
      .from('subjects')
      .select('*')
      .eq('department_id', selectedDeptId)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) {
          setSubjects(data as Subject[])
          if (data.length > 0) {
            setSelectedSubjectId(data[0].id)
          } else {
            setSelectedSubjectId('')
          }
        }
      })
  }, [selectedDeptId])

  // Load modules filtered by subject
  useEffect(() => {
    if (!selectedSubjectId) {
      setModules([])
      setSelectedModuleId('')
      return
    }

    supabase
      .from('subject_modules')
      .select('*')
      .eq('subject_id', selectedSubjectId)
      .order('module_number')
      .then(({ data }) => {
        if (data) {
          setModules(data as SubjectModule[])
          if (data.length > 0) {
            setSelectedModuleId(data[0].id)
          } else {
            setSelectedModuleId('')
          }
        }
      })
  }, [selectedSubjectId])

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (selected.size > 20 * 1024 * 1024) {
        setError('File size exceeds the 20 MB limit.')
        return
      }
      setError(null)
      setFile(selected)
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!file) {
      setError('Please select a file to upload.')
      return
    }

    if (!selectedSubjectId) {
      setError('Please select or specify a subject.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf'
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `notes/${selectedSubjectId}/${Date.now()}_${sanitizedName}`

      // 1. Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('academic-notes')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (storageError) throw storageError

      // 2. Ensure at least one module exists if none returned
      let finalModuleId = selectedModuleId
      if (!finalModuleId) {
        // Create Module 1 default
        const { data: newMod, error: modErr } = await supabase
          .from('subject_modules')
          .insert({
            subject_id: selectedSubjectId,
            module_number: 1,
            title: 'General Module',
          })
          .select()
          .single()

        if (modErr) throw modErr
        finalModuleId = newMod.id
      }

      // 3. Insert record into academic_notes
      const { error: dbError } = await supabase
        .from('academic_notes')
        .insert({
          subject_id: selectedSubjectId,
          module_id: finalModuleId,
          uploader_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          file_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          file_extension: extension,
        })

      if (dbError) throw dbError

      onNoteUploaded()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish academic note')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="card w-full max-w-lg p-6 space-y-5 my-8 border border-surface-border">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud size={20} className="text-brand-400" />
            Upload Study Material / Notes
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Department & Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              id="upload-dept"
              label="Department"
              value={selectedDeptId}
              onChange={e => setSelectedDeptId(e.target.value)}
              options={departments.map(d => ({ value: d.id, label: d.name }))}
            />

            <Select
              id="upload-sem"
              label="Semester"
              value={selectedSemId}
              onChange={e => setSelectedSemId(e.target.value)}
              options={semesters.map(s => ({ value: s.id, label: s.label }))}
            />
          </div>

          {/* Subject & Module */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Subject Course
              </label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="select w-full"
                required
              >
                {subjects.length > 0 ? (
                  subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code ? `${s.code} - ${s.name}` : s.name}
                    </option>
                  ))
                ) : (
                  <option value="">No subjects in department</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Module / Unit
              </label>
              <select
                value={selectedModuleId}
                onChange={e => setSelectedModuleId(e.target.value)}
                className="select w-full"
              >
                {modules.map(m => (
                  <option key={m.id} value={m.id}>
                    Module {m.module_number}: {m.title}
                  </option>
                ))}
                {modules.length === 0 && <option value="">Module 1 (Default)</option>}
              </select>
            </div>
          </div>

          {/* Title */}
          <Input
            id="upload-title"
            label="Note Title"
            placeholder="e.g. Complete Unit 2 Notes with Solved Problems"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description / Summary (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Covers B-Trees, Normalization (1NF to BCNF) and sample exam questions."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="textarea w-full text-xs"
            />
          </div>

          {/* File Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Attach Document (PDF, DOCX, PPTX — Max 20 MB)
            </label>
            <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-surface-base/60 text-center hover:border-brand-500/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer space-y-2 block">
                <FileUp size={24} className="mx-auto text-brand-400" />
                <span className="text-xs text-slate-300 block font-medium">
                  {file ? file.name : 'Click to select or drag and drop study notes'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Supported: PDF, Word, PowerPoint'}
                </span>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={uploading}
              icon={<UploadCloud size={15} />}
            >
              Publish to Campus
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
