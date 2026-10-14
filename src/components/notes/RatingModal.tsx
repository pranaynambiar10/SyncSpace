import React, { useState, useEffect } from 'react'
import { Star, X, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

interface RatingModalProps {
  noteId: string
  noteTitle: string
  isOpen: boolean
  onClose: () => void
  onRatingSubmitted: () => void
}

export const RatingModal: React.FC<RatingModalProps> = ({
  noteId,
  noteTitle,
  isOpen,
  onClose,
  onRatingSubmitted,
}) => {
  const { user } = useAuth()
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !user) return

    // Fetch existing user rating if any
    supabase
      .from('note_ratings')
      .select('rating, review_text')
      .eq('note_id', noteId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRating(data.rating)
          setReviewText(data.review_text || '')
        }
      })
  }, [isOpen, noteId, user])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setError(null)

    try {
      const { error: upsertError } = await supabase
        .from('note_ratings')
        .upsert(
          {
            note_id: noteId,
            user_id: user.id,
            rating,
            review_text: reviewText.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'note_id,user_id' }
        )

      if (upsertError) throw upsertError

      onRatingSubmitted()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-md p-6 space-y-5 border border-surface-border">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Star size={18} className="text-amber-400 fill-amber-400" />
            Rate Study Note
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <p className="text-xs text-slate-400">Resource:</p>
          <p className="text-sm font-semibold text-slate-200 truncate">{noteTitle}</p>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star selector */}
          <div className="text-center py-2 space-y-2">
            <span className="text-xs text-slate-400 font-medium block">Select Rating (1 to 5 Stars)</span>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => {
                const filled = (hoverRating ?? rating) >= star
                return (
                  <button
                    type="button"
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(star)}
                    className="p-1 text-slate-600 transition-transform active:scale-95 focus:outline-none"
                  >
                    <Star
                      size={28}
                      className={
                        filled
                          ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                          : 'text-slate-600 hover:text-slate-400'
                      }
                    />
                  </button>
                )
              })}
            </div>
            <span className="text-xs text-amber-300 font-semibold block">
              {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'][rating - 1]}
            </span>
          </div>

          {/* Review comments */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Review or Feedback (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Comprehensive notes with solved numericals for Module 3."
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              className="textarea w-full text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={submitting}
              icon={<CheckCircle2 size={15} />}
            >
              Submit Rating
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
