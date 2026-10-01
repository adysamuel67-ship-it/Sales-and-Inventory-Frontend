'use client'

import React from 'react'
import ChatAvatar from './ChatAvatar'

interface TypingIndicatorProps {
  name?: string | null
  userId?: number | null
  /** Everyone currently typing, so the row can say "A, B and 2 others". */
  others?: { user_id: number; name?: string | null }[]
}

const firstName = (n?: string | null) => (n ? n.trim().split(/\s+/)[0] : '')

export default function TypingIndicator({ name, userId, others = [] }: TypingIndicatorProps) {
  // Only the first typist is drawn as a bubble; the rest collapse into the label.
  const names = [firstName(name), ...others.filter(o => o.user_id !== userId).map(o => firstName(o.name))]
    .filter(Boolean)
    .slice(0, 3)

  let label = ''
  if (names.length === 1) label = `${names[0]} is typing`
  else if (names.length === 2) label = `${names[0]} and ${names[1]} are typing`
  else if (names.length === 3) label = `${names[0]}, ${names[1]} and ${names[2]} are typing`
  else if (names.length > 3) label = 'Several people are typing'
  else label = 'Someone is typing'

  return (
    <div className="flex items-end gap-2">
      <ChatAvatar userId={userId} name={name} size="sm" className="mb-1 shrink-0" />
      <div className="relative rounded-2xl rounded-bl-md bg-white border border-black/[0.05] px-4 py-3.5 shadow-sm">
        {/* Three dots that fade up in sequence. The old version bounced
            coloured circles, which read as a cartoon rather than a live reply. */}
        <div className="flex items-center gap-1.5 h-2">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#8A99A5] animate-typing"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
      </div>
      <span className="text-[11px] text-[#8696A0] mb-2.5 max-w-[160px] truncate">{label}</span>
    </div>
  )
}