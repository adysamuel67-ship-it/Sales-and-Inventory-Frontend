import type { ChatMessageData, ChatPresenceUser } from '@/lib/api'

export type ChatWSEvent =
  | { type: 'message'; data: ChatMessageData }
  | { type: 'edit'; data: ChatMessageData }
  | { type: 'delete'; data: ChatMessageData }
  | { type: 'typing'; data: { user_id: number; business_id: number; name?: string | null; is_typing: boolean } }
  | { type: 'presence'; data: { business_id: number; online: ChatPresenceUser[] } }
  | { type: 'error'; message: string }
  | { type: 'pong'; data: unknown }

export interface TypingUser {
  user_id: number
  name?: string | null
}

export interface ChatSocketState {
  connected: boolean
  connecting: boolean
  error: string | null
  presence: ChatPresenceUser[]
  typingUsers: TypingUser[]
}