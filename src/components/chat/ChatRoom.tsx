'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  chatAPI,
  fullMediaUrl,
  normalizeChatMessage,
  type ChatMessageData,
  type ChatPresenceUser,
} from '@/lib/api'
import { useChatSocket } from './useChatSocket'
import type { ChatWSEvent } from './types'
import MessageList from './MessageList'
import ChatInput, { type AttachmentPayload } from './ChatInput'
import ChatAvatar from './ChatAvatar'
import type { TypingUser } from './types'

interface ChatRoomProps {
  businessId: number
  businessName?: string
  selfUserId: number | null
  fullScreen?: boolean
  onBack?: () => void
}

function deriveMaxId(messages: ChatMessageData[]): number {
  let max = 0
  for (const m of messages) {
    if (m.id && m.id > max) max = m.id
  }
  return max
}

export default function ChatRoom({ businessId, businessName, selfUserId, fullScreen, onBack }: ChatRoomProps) {
  const { state, sendMessage, sendTyping, subscribe } = useChatSocket(businessId, selfUserId, {
    enabled: !!businessId && selfUserId != null,
  })

  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [bannerError, setBannerError] = useState('')
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null)
  const [lightbox, setLightbox] = useState<ChatMessageData | null>(null)

  const lastReadSentRef = useRef(0)
  const unsubsRef = useRef<(() => void) | null>(null)

  const setReadPosition = useCallback(
    (maxId: number) => {
      if (!businessId || !maxId || maxId <= lastReadSentRef.current) return
      lastReadSentRef.current = maxId
      chatAPI.setReadPosition(businessId, maxId).catch(() => {})
    },
    [businessId]
  )

  const loadHistory = useCallback(
    async (reset: boolean) => {
      if (!businessId) return
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      try {
        const { data } = await chatAPI.history(businessId, {
          limit: 50,
          before_id: reset ? undefined : (nextBeforeId ?? undefined),
        })
        const items = (data?.items || []).map(normalizeChatMessage)
        if (reset) {
          setMessages(items)
          setHasMore(!!data?.has_more)
          setNextBeforeId(data?.next_before_id ?? null)
          setReadPosition(deriveMaxId(items))
        } else {
          setMessages((prev) => {
            const seen = new Map<number | undefined, ChatMessageData>()
            for (const m of prev) seen.set(m.id, m)
            for (const m of items) seen.set(m.id, m)
            return Array.from(seen.values()).sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
          })
          setHasMore(!!data?.has_more)
          setNextBeforeId(data?.next_before_id ?? null)
        }
      } catch (err: any) {
        setBannerError(err?.message || 'Could not load messages')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [businessId, nextBeforeId, setReadPosition]
  )

  const handleEvent = useCallback(
    (event: ChatWSEvent) => {
      if (event.type === 'message') {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.data.id)) return prev
          const next = [...prev, normalizeChatMessage(event.data)].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
          return next
        })
        setReadPosition(event.data.id ?? deriveMaxId([event.data]))
        return
      }
      if (event.type === 'edit') {
        const updated = normalizeChatMessage(event.data)
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
        return
      }
      if (event.type === 'delete') {
        const updated = normalizeChatMessage(event.data)
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
        setEditing((prev) => (prev?.id === updated.id ? null : prev))
        return
      }
      if (event.type === 'error') {
        setBannerError(event.message || 'Chat error')
      }
    },
    [setReadPosition]
  )

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !nextBeforeId) return
    loadHistory(false)
  }, [loadingMore, hasMore, nextBeforeId, loadHistory])

  useEffect(() => {
    if (!businessId || selfUserId == null) return
    let cancelled = false
    lastReadSentRef.current = 0
    loadHistory(true)

    const unsub = subscribe(handleEvent)
    unsubsRef.current = unsub
    return () => {
      cancelled = true
      unsub()
      unsubsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  const handleSendText = useCallback(
    (text: string) => {
      const sent = sendMessage({ message: text })
      if (!sent) setBannerError('Message not sent — reconnecting…')
    },
    [sendMessage]
  )

  const handleSendAttachment = useCallback(
    (attachment: AttachmentPayload) => {
      const sent = sendMessage({ message: '', ...attachment })
      if (!sent) setBannerError('Message not sent — reconnecting…')
    },
    [sendMessage]
  )

  const uploadAttachment = useCallback(
    async (file: File, onProgress: (pct: number) => void): Promise<AttachmentPayload> => {
      const { data } = await chatAPI.upload(businessId, file, onProgress)
      return {
        attachment_url: fullMediaUrl(data?.attachment_url) || '',
        attachment_type: data?.attachment_type || '',
        attachment_name: data?.attachment_name || file.name,
        attachment_size: data?.attachment_size || file.size,
      }
    },
    [businessId]
  )

  const handleSaveEdit = useCallback(
    async (id: number, text: string) => {
      try {
        const { data } = await chatAPI.editMessage(businessId, id, text)
        const updated = normalizeChatMessage(data)
        setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)))
      } catch (err: any) {
        setBannerError(err?.message || 'Could not edit message')
      }
    },
    [businessId]
  )

  const handleStartEdit = useCallback((msg: ChatMessageData) => {
    if (!msg.id) return
    setEditing({ id: msg.id, text: msg.message || '' })
  }, [])

  const handleDelete = useCallback(
    async (msg: ChatMessageData) => {
      if (!msg.id) return
      if (!window.confirm('Delete this message?')) return
      try {
        const { data } = await chatAPI.deleteMessage(businessId, msg.id)
        const updated = normalizeChatMessage(data)
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? updated : m)))
        setEditing((prev) => (prev?.id === msg.id ? null : prev))
      } catch (err: any) {
        setBannerError(err?.message || 'Could not delete message')
      }
    },
    [businessId]
  )

  const onlineCount = state.presence.length
  const presencePreview = state.presence.slice(0, 5)

  return (
    <div className={`flex flex-col bg-surface overflow-hidden ${fullScreen ? 'h-dvh rounded-none border-0' : 'h-[calc(100dvh-7rem)] min-h-[520px] lg:h-[calc(100dvh-8.75rem)] rounded-xl lg:rounded-2xl border border-gray-200 shadow-sm'}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 bg-primary text-white">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors shrink-0"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
          )}
          {businessName ? (
            <ChatAvatar userId={businessId} name={businessName} size="md" className="ring-2 ring-white/20" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold truncate leading-tight">
              {businessName ? businessName : 'Team Chat'}
            </h2>
            <p className="text-[11px] flex items-center gap-1.5 text-white/80">
              <span className={`w-1.5 h-1.5 rounded-full ${state.connected ? 'bg-emerald-400' : 'bg-amber-300 animate-pulse'}`} />
              {state.connected
                ? onlineCount > 0
                  ? `${onlineCount} ${onlineCount === 1 ? 'member' : 'members'} online`
                  : 'online'
                : 'Connecting…'}
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-0.5">
          {presencePreview.map((u: ChatPresenceUser) => (
            <ChatAvatar key={u.user_id} userId={u.user_id} name={u.name} size="sm" online className="-mr-2 last:mr-0 ring-2 ring-primary" />
          ))}
          {onlineCount > 5 && (
            <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-[10px] font-semibold text-white">
              +{onlineCount - 5}
            </span>
          )}
        </div>
      </div>

      {bannerError && (
        <div className="px-4 py-2 bg-danger-light/60 border-b border-red-100 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-danger shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-danger flex-1">{bannerError}</p>
          <button type="button" onClick={() => setBannerError('')} className="text-danger/70 hover:text-danger" aria-label="Dismiss">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <MessageList
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        typingUsers={state.typingUsers}
        selfUserId={selfUserId}
        onEdit={handleStartEdit}
        onDelete={handleDelete}
        onOpenImage={setLightbox}
      />

      <ChatInput
        connected={state.connected}
        editing={editing}
        onSendText={handleSendText}
        onSendAttachment={handleSendAttachment}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={() => setEditing(null)}
        onTyping={sendTyping}
        uploadAttachment={uploadAttachment}
      />

      {lightbox && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.attachment_url || ''}
              alt={lightbox.attachment_name || 'image'}
              className="w-full max-h-[85dvh] object-contain rounded-2xl shadow-2xl"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-white/80 truncate px-1">
                {lightbox.attachment_name || 'Image'} · {lightbox.name || ''}
              </p>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="shrink-0 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}