import React, { useState, useEffect, useMemo } from 'react'
import {
  BookOpen, Plus, Search, Filter, Star, Bookmark,
  TrendingUp, Sparkles, FolderDown, GraduationCap, RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { NoteCard } from '@/components/notes/NoteCard'
import type { NoteCardData } from '@/components/notes/NoteCard'
import { UploadNoteModal } from '@/components/notes/UploadNoteModal'
import type { Department, Semester } from '@/types'

type ActiveTab = 'all' | 'top_rated' | 'bookmarks'

export default function NotesLibrary() {
  const { user, profile } = useAuth()

  const [notes, setNotes] = useState<NoteCardData[]>([])
  const [topRatedNotes, setTopRatedNotes] = useState<NoteCardData[]>([])
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())

  const [departments, setDepartments] = useState<Department[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])

  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedSem, setSelectedSem] = useState('')
  const [activeTab, setActiveTab] = useState<ActiveTab>('all')

  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Fetch departments & semesters
  useEffect(() => {
    Promise.all([
      supabase.from('departments').select('*').eq('is_active', true).order('name'),
      supabase.from('semesters').select('*').eq('is_active', true).order('sort_order'),
    ]).then(([deptRes, semRes]) => {
      if (deptRes.data) setDepartments(deptRes.data as Department[])
      if (semRes.data) setSemesters(semRes.data as Semester[])
    })
  }, [])

  // Load notes and user bookmarks
  const loadNotesData = async () => {
    setLoading(true)
    try {
      // 1. Fetch user bookmarks
      let userBookmarks = new Set<string>()
      if (user) {
        const { data: bData } = await supabase
          .from('note_bookmarks')
          .select('note_id')
          .eq('user_id', user.id)

        if (bData) {
          userBookmarks = new Set(bData.map(b => b.note_id))
          setBookmarkedIds(userBookmarks)
        }
      }

      // 2. Fetch all active notes with subject & module info
      const { data: notesData, error: notesError } = await supabase
        .from('academic_notes')
        .select(`
          id, title, description, file_path, file_name, file_size, file_extension,
          download_count, average_rating, total_ratings, is_verified, created_at,
          uploader_id,
          subjects:subject_id ( id, name, code, department_id, semester_id ),
          subject_modules:module_id ( id, module_number, title ),
          profiles:uploader_id ( full_name, avatar_url )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (notesError) throw notesError

      if (notesData) {
        const mapped: NoteCardData[] = notesData.map((n: any) => ({
          id: n.id,
          title: n.title,
          description: n.description,
          file_path: n.file_path,
          file_name: n.file_name,
          file_size: n.file_size,
          file_extension: n.file_extension,
          download_count: n.download_count ?? 0,
          average_rating: Number(n.average_rating) || 0,
          total_ratings: n.total_ratings ?? 0,
          is_verified: n.is_verified ?? false,
          created_at: n.created_at,
          subject_name: n.subjects?.name,
          subject_code: n.subjects?.code,
          module_number: n.subject_modules?.module_number,
          module_title: n.subject_modules?.title,
          uploader_name: n.profiles?.full_name,
          uploader_avatar: n.profiles?.avatar_url,
          is_bookmarked: userBookmarks.has(n.id),
        }))
        setNotes(mapped)
      }

      // 3. Fetch top-rated discovery view
      const { data: topData } = await supabase
        .from('top_rated_notes_view')
        .select('*')
        .limit(20)

      if (topData) {
        setTopRatedNotes(
          topData.map((n: any) => ({
            id: n.id,
            title: n.title,
            description: n.description,
            file_path: n.file_path,
            file_name: n.file_name,
            file_size: n.file_size,
            file_extension: n.file_extension,
            download_count: n.download_count ?? 0,
            average_rating: Number(n.average_rating) || 0,
            total_ratings: n.total_ratings ?? 0,
            is_verified: n.is_verified ?? false,
            created_at: n.created_at,
            subject_name: n.subject_name,
            subject_code: n.subject_code,
            module_number: n.module_number,
            module_title: n.module_title,
            uploader_name: n.uploader_name,
            uploader_avatar: n.uploader_avatar,
            is_bookmarked: userBookmarks.has(n.id),
          }))
        )
      }
    } catch (err) {
      console.error('Failed to load notes', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotesData()
  }, [user])

  // Filter notes based on search, active tab, and department/semester dropdowns
  const displayedNotes = useMemo(() => {
    let sourceList = notes
    if (activeTab === 'top_rated') sourceList = topRatedNotes
    if (activeTab === 'bookmarks') {
      sourceList = notes.filter(n => bookmarkedIds.has(n.id))
    }

    return sourceList.filter(note => {
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        note.title.toLowerCase().includes(q) ||
        (note.description && note.description.toLowerCase().includes(q)) ||
        (note.subject_code && note.subject_code.toLowerCase().includes(q)) ||
        (note.subject_name && note.subject_name.toLowerCase().includes(q)) ||
        (note.uploader_name && note.uploader_name.toLowerCase().includes(q))

      return matchesSearch
    })
  }, [notes, topRatedNotes, bookmarkedIds, activeTab, search])

  const handleBookmarkToggled = (noteId: string, isBookmarked: boolean) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev)
      if (isBookmarked) next.add(noteId)
      else next.delete(noteId)
      return next
    })
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Academic Notes Library
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Sparkles size={12} />
              Peer Knowledge Base
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Search, download, rate, and discover peer-verified notes across subjects and syllabus modules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadNotesData}
            icon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowUploadModal(true)}
            icon={<Plus size={16} />}
          >
            Upload Notes
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'all'
              ? 'border-brand-500 text-brand-400 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen size={16} />
          All Notes ({notes.length})
        </button>

        <button
          onClick={() => setActiveTab('top_rated')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'top_rated'
              ? 'border-brand-500 text-brand-400 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Star size={16} className="text-amber-400 fill-amber-400" />
          Top Rated Discovery
        </button>

        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'bookmarks'
              ? 'border-brand-500 text-brand-400 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bookmark size={16} />
          My Bookmarks ({bookmarkedIds.size})
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Input
            id="notes-search-input"
            placeholder="Search by title, subject code (e.g. CAS 2101), author..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search size={16} className="text-slate-500" />}
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="select text-xs h-9"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSem}
            onChange={e => setSelectedSem(e.target.value)}
            className="select text-xs h-9"
          >
            <option value="">All Semesters</option>
            {semesters.map(s => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes Grid */}
      {displayedNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onRatingChanged={loadNotesData}
              onBookmarkToggled={handleBookmarkToggled}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="p-12 text-center border-dashed border-surface-border">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-elevated flex items-center justify-center text-slate-500 mb-4">
            {activeTab === 'bookmarks' ? <Bookmark size={30} /> : <BookOpen size={30} />}
          </div>
          <h3 className="text-lg font-bold text-white">
            {activeTab === 'bookmarks'
              ? 'No saved bookmarks yet'
              : 'No notes found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
            {activeTab === 'bookmarks'
              ? 'Save useful syllabus notes by clicking the bookmark icon on any note card.'
              : 'Be the first to upload lecture notes, question banks, or revision materials for your semester.'}
          </p>
          <div className="mt-5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowUploadModal(true)}
              icon={<Plus size={14} />}
            >
              Upload Notes
            </Button>
          </div>
        </Card>
      )}

      {/* Upload Modal */}
      <UploadNoteModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onNoteUploaded={loadNotesData}
      />
    </div>
  )
}
