'use client'

import React from 'react'
import ChatAvatar, { avatarColor } from './ChatAvatar'

export default function MessageSkeleton({ self = false }: { self?: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${self ? 'justify-end' : 'justify-start'}`}>
      {!self ? (
        <div className={`w-7 h-7 rounded-full ${avatarColor(1)} opacity-20 shrink-0`} />
      ) : (
        <div className={`w-7 h-7 rounded-full ${avatarColor(1)} opacity-20 shrink-0 order-2`} />
      )}
      <div className="space-y-2">
        <div className={`h-2 w-16 rounded-full bg-gray-200 ${self ? 'ml-auto' : ''}`} />
        <div className={`rounded-2xl p-3.5 space-y-2 ${self ? 'bg-primary-light' : 'bg-white border border-black/5'}`}>
          <div className={`h-3 w-48 rounded-full ${self ? 'bg-black/10' : 'bg-gray-200'}`} />
          <div className={`h-3 w-32 rounded-full ${self ? 'bg-black/10' : 'bg-gray-200'}`} />
        </div>
      </div>
    </div>
  )
}