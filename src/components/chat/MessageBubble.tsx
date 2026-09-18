'use client'

import React, { useState } from 'react'
import type { ChatMessageData } from '@/lib/api'
import ChatAvatar from './ChatAvatar'
import { formatFileSize } from './chatUtils'

interface MessageBubbleProps {
  message: ChatMessageData
  self: boolean
  showSender: boolean
  onEdit?: (msg: ChatMessageData) => void
  onDelete?: (msg: ChatMessageData) => void
  onOpenImage?: (msg: ChatMessageData) => void
  onOpenMenu?: (msg: ChatMessageData, anchor?: { x: number; y: number }) => void
}

function formatTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatBytes(bytes?: number | null): string {
  return formatFileSize(bytes ?? 0)
}

export default function MessageBubble({ message, self, showSender, onEdit, onDelete, onOpenImage, onOpenMenu }: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const isImage = !!message.attachment_url &&
    (message.attachment_type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(message.attachment_name || ''))

  const canManage = self && !message.is_deleted && (onEdit || onDelete)

  const renderAttachment = () => {
    if (!message.attachment_url) return null
    if (isImage) {
      return (
        <button
          type="button"
          onClick={() => onOpenImage?.(message)}
          className="block overflow-hidden rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Open image"
        >
          <img
            src={message.attachment_url}
            alt={message.attachment_name || 'image'}
            className="max-w-full max-h-64 object-cover rounded-xl"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            loading="lazy"
          />
        </button>
      )
    }
    return (
      <a
        href={message.attachment_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-2.5 rounded-xl bg-black/[0.06] hover:bg-black/[0.1] transition-colors group"
      >
        <div className="w-9 h-9 rounded-lg bg-white/90 flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-5 h-5 text-neutral" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-[220px]">{message.attachment_name || 'Attachment'}</p>
          {message.attachment_size ? <p className="text-xs opacity-70">{formatBytes(message.attachment_size)}</p> : null}
        </div>
        <svg className="w-4 h-4 opacity-40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
        </svg>
      </a>
    )
  }

  return (
    <div className={`flex items-end gap-2 group ${self ? 'justify-end' : 'justify-start'}`}>
      {!self && (
        <ChatAvatar userId={message.from ?? message.user_id} name={message.name} size="sm" className="mb-0.5" />
      )}

      <div className={`max-w-[78%] sm:max-w-[70%] min-w-0 ${self ? 'items-end' : 'items-start'}`}>
        {!self && showSender && message.name && (
          <div className="flex items-center gap-1.5 pl-1 mb-1">
            <span className="text-[13px] font-semibold text-gray-800">{message.name}</span>
            {message.role && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-light">· {message.role.replaceAll('_', ' ')}</span>
            )}
          </div>
        )}

        <div className="relative">
          {canManage && (
            <div className="absolute -top-2.5 right-1 z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-0.5 rounded-lg bg-gray-900/90 backdrop-blur px-1 py-0.5 shadow-lg">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(message)}
                    className="p-1.5 rounded-md text-white/90 hover:text-white hover:bg-white/15 transition-colors"
                    aria-label="Edit message"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(message)}
                    className="p-1.5 rounded-md text-red-200 hover:text-red-100 hover:bg-red-500/30 transition-colors"
                    aria-label="Delete message"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className={`relative rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed break-words shadow-sm ${
            self
              ? 'bg-primary text-white rounded-br-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
          }`}>
            {message.is_deleted ? (
              <p className="italic opacity-70 text-[13px]">This message was deleted</p>
            ) : (
              <>
                {message.attachment_url && <div className={message.message ? 'mb-2' : ''}>{renderAttachment()}</div>}
                {message.message && <p className="whitespace-pre-wrap">{message.message}</p>}
              </>
            )}

            <div className={`flex items-center gap-1 mt-1 ${self ? 'justify-end' : 'justify-start'} text-[10px] ${self ? 'text-white/70' : 'text-neutral-light'}`}>
              <span>{formatTime(message.sent_at ?? message.created_at)}</span>
              {message.is_edited && !message.is_deleted && <span>· Edited</span>}
              {self && message.sent_at && (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {self && <ChatAvatar userId={message.from ?? message.user_id} name={message.name} size="sm" className="mb-0.5" />}
    </div>
  )
}