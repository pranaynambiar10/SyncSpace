import React, { useState } from 'react'
import { Plus, X, CheckCircle2, AlertCircle, FileText, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'

interface MemberOption {
  user_id: string
  full_name: string
}

interface CreateTaskModalProps {
  assignmentId: string
  members: MemberOption[]
  isOpen: boolean
  onClose: () => void
  onTaskCreated: () => void
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  assignmentId,
  members,
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [weight, setWeight] = useState(15)
  const [deliverableType, setDeliverableType] = useState('document')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState('medium')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!title.trim()) {
      setError('Please provide a task title.')
      return
    }

    if (weight <= 0) {
      setError('Task weight must be greater than 0.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { error: insErr } = await supabase
        .from('tasks')
        .insert({
          assignment_id: assignmentId,
          title: title.trim(),
          description: description.trim() || null,
          assigned_to: assignedTo || null,
          reviewer_id: user.id, // default to leader
          weight: Number(weight),
          deliverable_type: deliverableType,
          priority,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          created_by: user.id,
          status: 'todo',
        })

      if (insErr) throw insErr

      onTaskCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="card w-full max-w-lg p-6 space-y-5 my-8 border border-surface-border">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus size={20} className="text-brand-400" />
            Add New Deliverable Task
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
          <Input
            id="task-title"
            label="Task / Deliverable Title"
            placeholder="e.g. Chapter 3: System Architecture & Data Flow Diagram"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description & Acceptance Criteria
            </label>
            <textarea
              rows={3}
              placeholder="Specify requirements needed for leader approval..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="textarea w-full text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Assign Contributor
              </label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="select w-full"
              >
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="task-weight"
              type="number"
              min={1}
              max={100}
              label="Progress Weight (Points)"
              required
              value={weight}
              onChange={e => setWeight(Number(e.target.value))}
              hint="Points awarded toward Verified Progress"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              id="task-type"
              label="Expected Deliverable Type"
              value={deliverableType}
              onChange={e => setDeliverableType(e.target.value)}
              options={[
                { value: 'document', label: 'Document (PDF / DOCX)' },
                { value: 'presentation', label: 'Presentation (PPTX / Slides)' },
                { value: 'written_response', label: 'Written Response / Text' },
                { value: 'url', label: 'Repository / URL Link' },
                { value: 'other', label: 'Other File / Artifact' },
              ]}
            />

            <Select
              id="task-priority"
              label="Priority Level"
              value={priority}
              onChange={e => setPriority(e.target.value)}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
          </div>

          <Input
            id="task-deadline"
            type="datetime-local"
            label="Milestone Deadline (Optional)"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={submitting}
              icon={<Plus size={15} />}
            >
              Create Deliverable Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
