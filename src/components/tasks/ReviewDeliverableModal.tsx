import React, { useState } from 'react'
import {
  CheckCircle2, XCircle, X, Download, FileText,
  AlertCircle, ShieldAlert, ExternalLink
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { formatDate } from '@/lib/utils'

export interface SubmissionDetails {
  id: string
  task_id: string
  submitted_by: string
  submitter_name?: string
  version_number: number
  file_path: string | null
  file_name: string | null
  written_response: string | null
  url: string | null
  submitted_at: string
}

interface ReviewDeliverableModalProps {
  submission: SubmissionDetails
  taskTitle: string
  isOpen: boolean
  onClose: () => void
  onReviewCompleted: () => void
}

export const ReviewDeliverableModal: React.FC<ReviewDeliverableModalProps> = ({
  submission,
  taskTitle,
  isOpen,
  onClose,
  onReviewCompleted,
}) => {
  const { user } = useAuth()
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isSelfSubmission = submission.submitted_by === user?.id

  const handleReview = async (decision: 'approved' | 'changes_requested') => {
    if (!user) return
    setSubmitting(true)
    setError(null)

    try {
      const { data, error: rpcErr } = await supabase.rpc('review_task_submission', {
        p_submission_id: submission.id,
        p_decision: decision,
        p_comment: comment.trim() || null,
      })

      if (rpcErr) throw rpcErr

      onReviewCompleted()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record review decision')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadFile = async () => {
    if (!submission.file_path) return
    try {
      const { data, error } = await supabase.storage
        .from('assignment-files')
        .createSignedUrl(submission.file_path, 300)

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err) {
      console.error('Error downloading deliverable', err)
      setError('Could not generate download link for this deliverable.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-lg p-6 space-y-5 border border-surface-border">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 size={20} className="text-brand-400" />
            Evaluate Task Submission
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Task & Submitter info */}
        <div className="space-y-1">
          <span className="text-xs text-slate-400">Task:</span>
          <p className="text-sm font-semibold text-slate-200">{taskTitle}</p>
          <p className="text-xs text-slate-400">
            Version {submission.version_number} • Submitted by{' '}
            <strong className="text-slate-200">{submission.submitter_name || 'Student'}</strong> on{' '}
            {formatDate(submission.submitted_at)}
          </p>
        </div>

        {/* Submitter != Reviewer warning */}
        {isSelfSubmission && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
            <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong>Academic Integrity Policy:</strong> You cannot review or approve your own deliverable. Another team member or delegated reviewer must evaluate this work.
            </div>
          </div>
        )}

        {error && <Alert variant="danger">{error}</Alert>}

        {/* Deliverable contents */}
        <div className="p-4 rounded-xl bg-surface-base border border-surface-border space-y-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Submitted Artifacts
          </span>

          {submission.file_name && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-surface-border">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-brand-400 flex-shrink-0" />
                <span className="text-xs text-slate-200 font-medium truncate">
                  {submission.file_name}
                </span>
              </div>
              <Button
                variant="secondary"
                size="xs"
                onClick={handleDownloadFile}
                icon={<Download size={12} />}
              >
                Download
              </Button>
            </div>
          )}

          {submission.url && (
            <div className="flex items-center justify-between text-xs p-2 rounded bg-surface-elevated">
              <span className="text-slate-400 truncate">{submission.url}</span>
              <a
                href={submission.url}
                target="_blank"
                rel="noreferrer"
                className="text-brand-400 hover:text-brand-300 flex items-center gap-1 font-semibold ml-2"
              >
                Open Link <ExternalLink size={12} />
              </a>
            </div>
          )}

          {submission.written_response && (
            <div className="text-xs text-slate-300 bg-surface-elevated p-3 rounded-lg border border-surface-border leading-relaxed whitespace-pre-wrap">
              {submission.written_response}
            </div>
          )}
        </div>

        {/* Review feedback input */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Review Comments / Feedback
          </label>
          <textarea
            rows={3}
            disabled={isSelfSubmission}
            placeholder="e.g. Excellent work on the data flow diagrams, approved for integration."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="textarea w-full text-xs"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-surface-border">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={isSelfSubmission || submitting}
              onClick={() => handleReview('changes_requested')}
              icon={<XCircle size={15} className="text-amber-400" />}
            >
              Request Changes
            </Button>

            <Button
              variant="primary"
              size="sm"
              disabled={isSelfSubmission || submitting}
              onClick={() => handleReview('approved')}
              icon={<CheckCircle2 size={15} />}
            >
              Approve Deliverable
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
