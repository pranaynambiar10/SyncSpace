import React, { useState, useEffect } from 'react'
import { Send, Megaphone, MessageSquare, AlertCircle, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { initials, avatarColor, timeAgo } from '@/lib/utils'

interface TeamDiscussionProps {
  assignmentId: string
  isLeader: boolean
}

interface MessageItem {
  id: string
  author_id: string
  body: string
  channel: 'announcement' | 'discussion'
  created_at: string
  author_name?: string
  author_avatar?: string | null
}

export const TeamDiscussion: React.FC<TeamDiscussionProps> = ({
  assignmentId,
  isLeader,
}) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [channel, setChannel] = useState<'discussion' | 'announcement'>('discussion')
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('assignment_messages')
        .select(`
          id, author_id, body, channel, created_at,
          profiles:author_id ( full_name, avatar_url )
        `)
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (data) {
        setMessages(
          data.map((m: any) => ({
            id: m.id,
            author_id: m.author_id,
            body: m.body,
            channel: m.channel,
            created_at: m.created_at,
            author_name: m.profiles?.full_name || 'Team Member',
            author_avatar: m.profiles?.avatar_url || null,
          }))
        )
      }
    } catch (err) {
      console.error('Failed to load team messages', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [assignmentId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !inputText.trim()) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('assignment_messages')
        .insert({
          assignment_id: assignmentId,
          author_id: user.id,
          body: inputText.trim(),
          channel,
        })

      if (error) throw error
      setInputText('')
      loadMessages()
    } catch (err) {
      console.error('Failed to send message', err)
    } finally {
      setSending(false)
    }
  }

  const filteredMessages = messages.filter(m => m.channel === channel)

  return (
    <Card className="p-5 flex flex-col h-[520px] border border-surface-border">
      {/* Channel Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChannel('discussion')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              channel === 'discussion'
                ? 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare size={14} /> Team Discussion
          </button>

          <button
            onClick={() => setChannel('announcement')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              channel === 'announcement'
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Megaphone size={14} /> Announcements
          </button>
        </div>

        <span className="text-[11px] text-slate-500">
          {channel === 'announcement' ? 'Leader announcements only' : 'All team members can post'}
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredMessages.map(msg => {
          const isMe = msg.author_id === user?.id
          const color = avatarColor(msg.author_id + (msg.author_name || ''))
          const abbr = initials(msg.author_name || 'Student')

          if (msg.channel === 'announcement') {
            return (
              <div
                key={msg.id}
                className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Megaphone size={13} /> Project Announcement
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {timeAgo(msg.created_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{msg.body}</p>
                <span className="text-[11px] text-slate-400 block pt-1">
                  Posted by {msg.author_name}
                </span>
              </div>
            )
          }

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ${color}`}>
                {abbr}
              </div>

              <div
                className={`max-w-[75%] p-3 rounded-xl text-xs space-y-1 ${
                  isMe
                    ? 'bg-brand-600/20 border border-brand-500/30 text-slate-100 rounded-tr-none'
                    : 'bg-surface-elevated border border-surface-border text-slate-200 rounded-tl-none'
                }`}
              >
                {!isMe && (
                  <p className="font-semibold text-brand-300 text-[11px]">
                    {msg.author_name}
                  </p>
                )}
                <p className="leading-relaxed">{msg.body}</p>
                <span className="text-[10px] text-slate-500 block text-right">
                  {timeAgo(msg.created_at)}
                </span>
              </div>
            </div>
          )
        })}

        {filteredMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-6 space-y-1">
            <MessageSquare size={24} className="text-slate-600 mb-1" />
            <p className="font-medium text-slate-400">
              No {channel === 'announcement' ? 'announcements' : 'messages'} yet
            </p>
            <p className="text-[11px]">
              {channel === 'announcement'
                ? isLeader
                  ? 'Post a project update or milestone alert for your team.'
                  : 'Your leader has not posted any announcements yet.'
                : 'Start the conversation or ask a project question.'}
            </p>
          </div>
        )}
      </div>

      {/* Composer Input */}
      {channel === 'announcement' && !isLeader ? (
        <div className="p-3 text-center text-xs text-slate-500 border-t border-surface-border">
          Only project leaders can publish announcements to this channel.
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="pt-3 border-t border-surface-border flex items-center gap-2">
          <input
            type="text"
            placeholder={
              channel === 'announcement'
                ? 'Broadcast a project announcement to the team...'
                : 'Type a message to your teammates...'
            }
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="input flex-1 text-xs"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={sending}
            icon={<Send size={14} />}
          >
            Send
          </Button>
        </form>
      )}
    </Card>
  )
}
