'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface AttachmentPayload {
  attachment_url: string
  attachment_type: string
  attachment_name: string
  attachment_size: number
}

interface ChatInputProps {
  connected: boolean
  editing: { id: number; text: string } | null
  onSendText: (text: string) => void
  onSendAttachment: (attachment: AttachmentPayload) => void
  onSaveEdit: (id: number, text: string) => void
  onCancelEdit: () => void
  onTyping?: (isTyping: boolean) => void
  uploadAttachment: (file: File, onProgress: (pct: number) => void) => Promise<AttachmentPayload>
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const TYPING_IDLE_MS = 1500

export default function ChatInput({
  connected,
  editing,
  onSendText,
  onSendAttachment,
  onSaveEdit,
  onCancelEdit,
  onTyping,
  uploadAttachment,
}: ChatInputProps) {
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (editing) {
      setText(editing.text)
      setUploadError('')
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (el) {
          el.focus()
          el.selectionStart = el.selectionEnd = el.value.length
          autoGrow(el)
        }
      })
    }
  }, [editing])

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const notifyTyping = useCallback(
    (isTyping: boolean) => {
      onTyping?.(isTyping)
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
        idleTimerRef.current = null
      }
      if (isTyping) {
        idleTimerRef.current = setTimeout(() => {
          onTyping?.(false)
        }, TYPING_IDLE_MS)
      }
    },
    [onTyping]
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    autoGrow(e.target)
    notifyTyping(true)
  }

  const handleSend = () => {
    if (!connected) return
    const value = text.trim()
    if (!value) return

    if (editing) {
      onSaveEdit(editing.id, value)
      onCancelEdit()
      setText('')
      notifyTyping(false)
      return
    }

    onSendText(value)
    setText('')
    notifyTyping(false)
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (el) el.style.height = 'auto'
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape' && editing) {
      onCancelEdit()
      setText('')
    }
  }

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !connected) return

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File is too large (max 10 MB)')
      return
    }
    setUploadError('')
    setUploading(true)
    setUploadProgress(0)
    try {
      const attachment = await uploadAttachment(file, setUploadProgress)
      onSendAttachment(attachment)
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-3 sm:px-4 py-3">
      {editing && (
        <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 bg-primary-light/70 rounded-xl px-3 py-2">
          <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487zm0 0L19.5 7.125" />
          </svg>
          <p className="text-xs font-medium text-gray-700 flex-1 truncate">Editing message</p>
          <button
            type="button"
            onClick={() => { onCancelEdit(); setText('') }}
            className="p-1 rounded-md text-neutral-light hover:text-gray-700 hover:bg-white transition-colors"
            aria-label="Cancel editing"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {uploading && (
          <div className="mb-2 flex items-center gap-3 bg-surfaceAlt rounded-xl px-3 py-2">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
            <div className="flex-1">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
            <span className="text-[11px] text-neutral-light shrink-0">{uploadProgress}%</span>
          </div>
        )}
        {uploadError && (
          <p className="mb-2 text-xs text-danger">{uploadError}</p>
        )}

        <div className={`flex items-end gap-2 rounded-2xl border bg-white transition-colors ${
          editing ? 'border-primary ring-2 ring-primary/20' : 'border-gray-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
        }`}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!connected || uploading}
            className="shrink-0 p-2.5 m-1 rounded-xl text-neutral-light hover:text-primary hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file or image"
            aria-label="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={pickFile} />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={connected ? 'Type a message…' : 'Connecting to chat…'}
            disabled={!connected}
            className="flex-1 resize-none bg-transparent px-1 py-2.5 text-[14px] text-gray-900 placeholder:text-neutral-light focus:outline-none disabled:opacity-60 max-h-40"
            aria-label="Message"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!connected || !text.trim() || uploading}
            className="shrink-0 m-1 mb-1.5 p-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            aria-label="Send message"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
          </button>
        </div>

        {!connected && (
          <p className="mt-2 text-[11px] text-neutral-light flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            Reconnecting to live chat…
          </p>
        )}
      </div>
    </div>
  )
}