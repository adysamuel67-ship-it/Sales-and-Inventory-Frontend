'use client'

import React from 'react'
import ChatAvatar, { avatarColor } from './ChatAvatar'

interface TypingIndicatorProps {
  name?: string | null
  userId?: number | null
}

export default function TypingIndicator({ name, userId }: TypingIndicatorProps) {
  return (
    <div className="flex items-end gap-2">
      <ChatAvatar userId={userId} name={name} size="sm" className="mb-0.5" />
      <div className="rounded-2xl rounded-bl-sm bg-white border border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${avatarColor(userId ?? 0)} animate-bounce`} style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
      <span className="text-[11px] text-neutral-light mt-1">
        {name ? `${name.split(' ')[0]} is typing` : 'typing'}
      </span>
    </div>
  )
}