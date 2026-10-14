import React, { useState } from 'react'
import { UploadCloud, FileUp, X, CheckCircle2, AlertCircle, Link as LinkIcon, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'

interface SubmitDeliverableModalProps {
  assignmentId: string
  taskId: string
  taskTitle: string
  deliverableType: string
  isOpen: boolean
  onClose: () => void
  onSubmitSuccess: () => void
}

export const SubmitDeliverableModal: React.FC<SubmitDeliverableModalProps> = ({
  assignmentId,
  taskId,
  taskTitle,
  deliverableType,
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  const { user } = useAuth()

  const [file, setFile] = useState<File | null>(null)
  const [writtenResponse, setWrittenResponse] = useState('')
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (selected.size > 25 * 1024 * 1024) {
        setError('Deliverable file size exceeds 25 MB limit.')
        return
      }
      setError(null)
      setFile(selected)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setError(null)

    try {
      let filePath: string | null = null
      let fileName: string | null = null
      let fileSize: number | null = null
      let mimeType: string | null = null

      // Upload file to private storage bucket if file deliverable
      if (file) {
        fileName = file.name
        fileSize = file.size
        mimeType = file.type || 'application/octet-stream'
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        filePath = `assignments/${assignmentId}/${taskId}/${Date.now()}_${cleanName}`

        const { error: uploadErr } = await supabase.storage
          .from('assignment-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadErr) throw uploadErr
      } else if (!writtenResponse.trim() && !url.trim()) {
        throw new Error('Please attach a file, enter a response, or provide a URL link.')
      }

      // Call submit_task_deliverable RPC
      const { data, error: rpcErr } = await supabase.rpc('submit_task_deliverable', {
        p_task_id: taskId,
        p_file_path: filePath,
        p_file_name: fileName,
        p_file_size: fileSize,
        p_mime_type: mimeType,
        p_written_response: writtenResponse.trim() || null,
        p_url: url.trim() || null,
      })

      if (rpcErr) throw rpcErr

      onSubmitSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit deliverable')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-lg p-6 space-y-5 border border-surface-border">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud size={20} className="text-brand-400" />
            Submit Task Deliverable
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <span className="text-xs text-slate-400">Target Task:</span>
          <p className="text-sm font-semibold text-slate-200">{taskTitle}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-medium bg-brand-500/10 text-brand-300 border border-brand-500/20 capitalize">
            Deliverable Type: {deliverableType}
          </span>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Upload Deliverable File
            </label>
            <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-surface-base/60 text-center hover:border-brand-500/50 transition-colors">
              <input
                type="file"
                id="deliverable-file"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="deliverable-file" className="cursor-pointer space-y-2 block">
                <FileUp size={24} className="mx-auto text-brand-400" />
                <span className="text-xs text-slate-300 block font-medium">
                  {file ? file.name : 'Click to select or drag and drop file'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF, Word, Slides, ZIP (Max 25 MB)'}
                </span>
              </label>
            </div>
          </div>

          {/* URL link if relevant */}
          <Input
            id="deliverable-url"
            label="Repository or Live Demo URL (Optional)"
            placeholder="https://github.com/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
          />

          {/* Notes / Written response */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Submission Notes / Written Response
            </label>
            <textarea
              rows={3}
              placeholder="Provide a summary of changes, completed criteria, or notes for the reviewer..."
              value={writtenResponse}
              onChange={e => setWrittenResponse(e.target.value)}
              className="textarea w-full text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={submitting}
              icon={<UploadCloud size={15} />}
            >
              Submit for Review
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
