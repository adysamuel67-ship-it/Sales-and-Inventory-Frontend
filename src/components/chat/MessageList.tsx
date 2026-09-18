'use client'

import React, { useCallback, useEffect, useRef } from 'react'
import type { ChatMessageData } from '@/lib/api'
import type { TypingUser } from './types'
import MessageBubble from './MessageBubble'
import MessageSkeleton from './MessageSkeleton'
import TypingIndicator from './TypingIndicator'
import { dayLabel, chatWallpaper } from './chatUtils'

interface MessageListProps {
  messages: ChatMessageData[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  typingUsers: TypingUser[]
  selfUserId: number | null
  onEdit?: (msg: ChatMessageData) => void
  onDelete?: (msg: ChatMessageData) => void
  onOpenImage?: (msg: ChatMessageData) => void
}

const sameAuthor = (a: ChatMessageData, b: ChatMessageData) =>
  (a.from ?? a.user_id) === (b.from ?? b.user_id)

const nearInTime = (a: ChatMessageData, b: ChatMessageData) => {
  const t1 = new Date(a.sent_at ?? a.created_at ?? '').getTime()
  const t2 = new Date(b.sent_at ?? b.created_at ?? '').getTime()
  if (isNaN(t1) || isNaN(t2)) return true
  return Math.abs(t1 - t2) < 5 * 60 * 1000
}

export default function MessageList({
  messages,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
  typingUsers,
  selfUserId,
  onEdit,
  onDelete,
  onOpenImage,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const prevFirstIdRef = useRef<number | null>(null)
  const prevCountRef = useRef(0)

  // Keep stick-to-bottom unless the user deliberately scrolls up.
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distFromBottom < 96

    if (el.scrollTop < 40 && hasMore && !loadingMore && prevFirstIdRef.current !== null) {
      onLoadMore()
    }
  }, [hasMore, loadingMore, onLoadMore])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // New message appended while at the bottom → scroll down smoothly.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (messages.length > prevCountRef.current && stickToBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    } else if (messages.length === 0) {
      el.scrollTop = el.scrollHeight
    }
    prevCountRef.current = messages.length
  }, [messages.length])

  // Older messages prepended → preserve scroll position.
  useEffect(() => {
    const el = containerRef.current
    if (!el || prevFirstIdRef.current === null) {
      prevFirstIdRef.current = messages[0]?.id ?? null
      return
    }
    const firstId = messages[0]?.id ?? null
    if (firstId != null && prevFirstIdRef.current !== null && firstId !== prevFirstIdRef.current) {
      const prevFirst = prevFirstIdRef.current
      const elt = el.querySelector(`[data-msg-id="${prevFirst}"]`) as HTMLElement | null
      if (elt) {
        el.scrollTop = elt.offsetTop
      } else {
        el.scrollTop = 0
      }
    }
    prevFirstIdRef.current = firstId
  }, [messages])

  // Jump to bottom on initial load.
  useEffect(() => {
    if (!loading && messages.length > 0) {
      const el = containerRef.current
      if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight
    }
  }, [loading, messages.length])

  const renderDay = (msg: ChatMessageData, idx: number) => {
    if (idx === 0) return dayLabel(msg.sent_at ?? msg.created_at)
    const prev = messages[idx - 1]
    return dayLabel(msg.sent_at ?? msg.created_at) === dayLabel(prev.sent_at ?? prev.created_at)
      ? null
      : dayLabel(msg.sent_at ?? msg.created_at)
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3 min-h-0" style={chatWallpaper}>
        <MessageSkeleton self />
        <MessageSkeleton />
        <MessageSkeleton self />
        <MessageSkeleton />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-6 py-4" style={chatWallpaper}>
      <div className="max-w-3xl mx-auto">
        {hasMore && (
          <div className="flex justify-center py-2">
            <span className="inline-flex items-center gap-2 text-[11px] text-neutral-light bg-white/70 backdrop-blur rounded-full px-3 py-1.5 border border-black/5">
              {loadingMore ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading earlier messages...
                </>
              ) : (
                'Scroll up for more'
              )}
            </span>
          </div>
        )}

        {messages.map((msg, idx) => {
          const label = renderDay(msg, idx)
          const prev = messages[idx - 1]
          const next = messages[idx + 1]
          const self = (msg.from ?? msg.user_id) === selfUserId
          const isFirstOfGroup = !prev || !sameAuthor(prev, msg) || !nearInTime(prev, msg)
          const isLastOfGroup = !next || !sameAuthor(msg, next) || !nearInTime(msg, next)
          const gapClass = isFirstOfGroup ? 'mt-3' : 'mt-[2px]'

          return (
            <div key={msg.id ?? `tmp-${idx}`}>
              {label && (
                <div className="flex items-center justify-center my-4">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#54656F] bg-white/80 backdrop-blur border border-black/5 rounded-full px-3 py-1">
                    {label}
                  </span>
                </div>
              )}
              <div data-msg-id={msg.id} className={gapClass}>
                <MessageBubble
                  message={msg}
                  self={self}
                  showSender={isFirstOfGroup}
                  showAvatar={self ? isLastOfGroup : isFirstOfGroup}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpenImage={onOpenImage}
                />
              </div>
            </div>
          )
        })}

        {typingUsers.length > 0 && (
          <div className="mt-3 flex items-end gap-1.5">
            <TypingIndicator name={typingUsers[0].name} userId={typingUsers[0].user_id} />
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-3 shadow-sm border border-black/5">
              <svg className="w-7 h-7 text-[#54656F]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#111B21]">No messages yet</p>
            <p className="text-xs text-[#54656F] mt-1 max-w-xs leading-relaxed">
              Say hello to your team! Messages appear here instantly for every member of this business.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}