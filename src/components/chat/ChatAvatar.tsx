import React from 'react'

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-600',
  'bg-fuchsia-500',
  'bg-indigo-500',
]

export function avatarColor(userId?: number | null): string {
  if (!userId) return 'bg-slate-400'
  return AVATAR_COLORS[userId % AVATAR_COLORS.length]
}

// WhatsApp-style per-member sender name colors that stay legible on white bubbles.
const NAME_COLORS = [
  'text-blue-600',
  'text-emerald-600',
  'text-violet-600',
  'text-amber-600',
  'text-rose-600',
  'text-cyan-600',
  'text-fuchsia-600',
  'text-indigo-600',
]

export function memberColor(userId?: number | null): string {
  if (!userId) return 'text-gray-600'
  return NAME_COLORS[userId % NAME_COLORS.length]
}

export function initials(name?: string | null, fallback = '?'): string {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface ChatAvatarProps {
  userId?: number | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  online?: boolean
  className?: string
}

const SIZES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
}

const DOT_SIZES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
}

export default function ChatAvatar({ userId, name, size = 'md', online = false, className = '' }: ChatAvatarProps) {
  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${SIZES[size]} ${avatarColor(userId)} rounded-full flex items-center justify-center text-white font-semibold select-none ring-2 ring-white`}
      >
        {initials(name)}
      </div>
      {online && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${DOT_SIZES[size]} rounded-full bg-emerald-500 ring-2 ring-white`}
        />
      )}
    </div>
  )
}