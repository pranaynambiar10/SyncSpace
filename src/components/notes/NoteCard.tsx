import React, { useState } from 'react'
import {
  FileText, Download, Star, Bookmark, CheckCircle2,
  Calendar, User, ExternalLink, ShieldCheck
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { initials, avatarColor, formatBytes, formatDate } from '@/lib/utils'
import { RatingModal } from './RatingModal'

export interface NoteCardData {
  id: string
  title: string
  description: string | null
  file_path: string
  file_name: string
  file_size: number
  file_extension: string
  download_count: number
  average_rating: number
  total_ratings: number
  is_verified: boolean
  created_at: string
  subject_name?: string
  subject_code?: string
  module_number?: number
  module_title?: string
  uploader_name?: string
  uploader_avatar?: string | null
  is_bookmarked?: boolean
}

interface NoteCardProps {
  note: NoteCardData
  onRatingChanged?: () => void
  onBookmarkToggled?: (noteId: string, isBookmarked: boolean) => void
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onRatingChanged,
  onBookmarkToggled,
}) => {
  const { user } = useAuth()
  const [isBookmarked, setIsBookmarked] = useState(note.is_bookmarked ?? false)
  const [bookmarking, setBookmarking] = useState(false)
  const [downloadCount, setDownloadCount] = useState(note.download_count)
  const [showRatingModal, setShowRatingModal] = useState(false)

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return

    setBookmarking(true)
    const nextState = !isBookmarked
    setIsBookmarked(nextState)

    try {
      if (nextState) {
        await supabase
          .from('note_bookmarks')
          .insert({ note_id: note.id, user_id: user.id })
      } else {
        await supabase
          .from('note_bookmarks')
          .delete()
          .eq('note_id', note.id)
          .eq('user_id', user.id)
      }
      onBookmarkToggled?.(note.id, nextState)
    } catch (err) {
      console.error('Failed to toggle bookmark', err)
      setIsBookmarked(!nextState) // revert on error
    } finally {
      setBookmarking(false)
    }
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()

    // Increment download count in DB
    supabase.rpc('increment_note_download', { p_note_id: note.id }).then(() => {
      setDownloadCount(prev => prev + 1)
    })

    // Get public URL from storage
    const { data } = supabase.storage
      .from('academic-notes')
      .getPublicUrl(note.file_path)

    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank')
    }
  }

  const uploaderName = note.uploader_name || 'Campus Student'
  const color = avatarColor(note.id + uploaderName)
  const abbr = initials(uploaderName)

  const ext = (note.file_extension || 'pdf').toLowerCase()
  const badgeColor =
    ext === 'pdf'
      ? 'bg-red-500/10 text-red-400 border-red-500/20'
      : ext === 'docx' || ext === 'doc'
      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'

  return (
    <>
      <Card className="p-5 flex flex-col justify-between hover:border-brand-500/40 transition-all duration-200 group relative">
        <div className="space-y-3">
          {/* Top badges & Bookmark */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {note.subject_code && (
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  {note.subject_code}
                </span>
              )}
              {note.module_number && (
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-surface-elevated text-slate-300 border border-surface-border">
                  Module {note.module_number}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-md text-xs uppercase font-mono font-bold border ${badgeColor}`}>
                {ext}
              </span>
            </div>

            <button
              onClick={handleToggleBookmark}
              disabled={bookmarking}
              aria-label="Bookmark note"
              className={`p-1.5 rounded-lg border transition-colors ${
                isBookmarked
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-surface-elevated border-surface-border text-slate-500 hover:text-slate-300'
              }`}
            >
              <Bookmark size={15} className={isBookmarked ? 'fill-amber-400' : ''} />
            </button>
          </div>

          {/* Title & Description */}
          <div>
            <h4 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-2">
              {note.title}
            </h4>
            {note.description && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {note.description}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-4 mt-4 border-t border-surface-border/60 space-y-3">
          {/* Rating and Downloads */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setShowRatingModal(true)}
              className="flex items-center gap-1 hover:text-amber-300 transition-colors py-0.5 px-1.5 -ml-1.5 rounded-md hover:bg-surface-elevated"
            >
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="font-semibold text-slate-200">
                {note.average_rating > 0 ? note.average_rating.toFixed(1) : 'No ratings'}
              </span>
              {note.total_ratings > 0 && (
                <span className="text-slate-500">({note.total_ratings})</span>
              )}
              <span className="text-[10px] text-brand-400 underline ml-1">Rate</span>
            </button>

            <span className="flex items-center gap-1 text-slate-400">
              <Download size={13} className="text-slate-500" />
              {downloadCount} downloads
            </span>
          </div>

          {/* Author info & Download Button */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${color}`}>
                {abbr}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">{uploaderName}</p>
                <p className="text-[11px] text-slate-500">{formatBytes(note.file_size)}</p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="xs"
              onClick={handleDownload}
              icon={<Download size={13} />}
            >
              Download
            </Button>
          </div>
        </div>
      </Card>

      <RatingModal
        noteId={note.id}
        noteTitle={note.title}
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onRatingSubmitted={() => onRatingChanged?.()}
      />
    </>
  )
}
