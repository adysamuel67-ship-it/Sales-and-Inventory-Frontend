'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { chatAPI, chatWebSocketUrl } from '@/lib/api'
import type { ChatMessageData, ChatPresenceUser } from '@/lib/api'
import type { ChatWSEvent, ChatSocketState, TypingUser } from './types'

const MAX_RECONNECT_DELAY = 15000
const HEARTBEAT_INTERVAL = 25000
const TYPING_VISIBLE_MS = 4000

export interface UseChatSocketOptions {
  enabled?: boolean
}

export function useChatSocket(businessId: number, selfUserId: number | null, options: UseChatSocketOptions = {}) {
  const enabled = options.enabled ?? true
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [presence, setPresence] = useState<ChatPresenceUser[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const listenersRef = useRef<Set<(e: ChatWSEvent) => void>>(new Set())
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typingTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const selfRef = useRef<number | null>(selfUserId)
  const businessRef = useRef<number>(businessId)
  const enabledRef = useRef(enabled)
  const closedRef = useRef(false)
  const lastTypingSentRef = useRef(0)
  const connectRef = useRef<() => void>(() => {})

  selfRef.current = selfUserId
  businessRef.current = businessId
  enabledRef.current = enabled

  const subscribe = useCallback((cb: (e: ChatWSEvent) => void) => {
    listenersRef.current.add(cb)
    return () => {
      listenersRef.current.delete(cb)
    }
  }, [])

  const notify = useCallback((event: ChatWSEvent) => {
    listenersRef.current.forEach((cb) => cb(event))
  }, [])

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  const scheduleReconnect = useCallback((delay: number) => {
    if (reconnectTimerRef.current) return
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null
      connectRef.current()
    }, delay)
  }, [])

  const startHeartbeat = useCallback(() => {
    clearHeartbeat()
    heartbeatRef.current = setInterval(() => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'ping' }))
        } catch {
          // ignore
        }
      }
    }, HEARTBEAT_INTERVAL)
  }, [clearHeartbeat])

  const handleIncoming = useCallback((event: ChatWSEvent) => {
    if (event.type === 'presence') {
      const online = (event.data.online || []).filter((u) => u.user_id !== selfRef.current)
      setPresence(online)
      return
    }
    if (event.type === 'typing') {
      const { user_id, name, is_typing } = event.data
      if (user_id === selfRef.current) return
      setTypingUsers((prev) => {
        const next = prev.filter((t) => t.user_id !== user_id)
        if (!is_typing) return next
        return [...next, { user_id, name }]
      })
      if (is_typing) {
        const existing = typingTimeoutsRef.current.get(user_id)
        if (existing) clearTimeout(existing)
        typingTimeoutsRef.current.set(
          user_id,
          setTimeout(() => {
            typingTimeoutsRef.current.delete(user_id)
            setTypingUsers((prev) => prev.filter((t) => t.user_id !== user_id))
          }, TYPING_VISIBLE_MS)
        )
      } else {
        const existing = typingTimeoutsRef.current.get(user_id)
        if (existing) {
          clearTimeout(existing)
          typingTimeoutsRef.current.delete(user_id)
        }
      }
      return
    }
    notify(event)
  }, [notify])

  const connect = useCallback(async () => {
    if (closedRef.current) return
    if (!enabledRef.current || !businessRef.current) return
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return
    }
    setConnecting(true)
    setError(null)
    try {
      const { data } = await chatAPI.wsTicket(businessRef.current)
      const ticket = data?.ticket
      if (!ticket) throw new Error('No ticket returned')
      const bizId = businessRef.current
      const ws = new WebSocket(chatWebSocketUrl(bizId, ticket))
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setConnecting(false)
        reconnectAttemptRef.current = 0
        startHeartbeat()
      }

      ws.onmessage = (ev) => {
        let parsed: any
        try {
          parsed = JSON.parse(ev.data)
        } catch {
          return
        }
        if (!parsed || typeof parsed !== 'object' || !parsed.type) return
        handleIncoming(parsed as ChatWSEvent)
      }

      ws.onerror = () => {
        setError('Connection error')
        setConnecting(false)
      }

      ws.onclose = () => {
        setConnected(false)
        setPresence([])
        setTypingUsers([])
        clearHeartbeat()
        wsRef.current = null
        if (closedRef.current) return
        const attempt = reconnectAttemptRef.current
        const delay = Math.min(1000 * Math.pow(2, attempt), MAX_RECONNECT_DELAY)
        reconnectAttemptRef.current = attempt + 1
        scheduleReconnect(delay)
      }
    } catch (err: any) {
      setConnecting(false)
      setError(err?.message || 'Could not connect to chat')
      if (closedRef.current) return
      const attempt = reconnectAttemptRef.current
      const delay = Math.min(1000 * Math.pow(2, attempt), MAX_RECONNECT_DELAY)
      reconnectAttemptRef.current = attempt + 1
      scheduleReconnect(delay)
    }
  }, [clearHeartbeat, handleIncoming, scheduleReconnect, startHeartbeat])

  connectRef.current = connect

  useEffect(() => {
    closedRef.current = false
    reconnectAttemptRef.current = 0
    if (enabled && businessId && selfUserId != null) {
      connect()
    }
    return () => {
      closedRef.current = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
      clearHeartbeat()
      const typingTimeouts = typingTimeoutsRef.current // eslint-disable-line react-hooks/exhaustive-deps
      typingTimeouts.forEach((t) => clearTimeout(t))
      typingTimeouts.clear()
      const ws = wsRef.current
      wsRef.current = null
      if (ws) {
        ws.onclose = null
        try {
          ws.close()
        } catch {
          // ignore
        }
      }
    }
  }, [businessId, enabled, selfUserId, connect, clearHeartbeat])

  const sendMessage = useCallback(
    (message: Omit<ChatMessageData, 'business_id'> & { message?: string }) => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return false
      ws.send(JSON.stringify({ type: 'message', ...message }))
      return true
    },
    []
  )

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      if (isTyping) {
        const now = Date.now()
        if (now - lastTypingSentRef.current < 700) return
        lastTypingSentRef.current = now
        ws.send(JSON.stringify({ type: 'typing', is_typing: true }))
      } else {
        lastTypingSentRef.current = 0
        ws.send(JSON.stringify({ type: 'typing', is_typing: false }))
      }
    },
    []
  )

  const state: ChatSocketState = {
    connected,
    connecting,
    error,
    presence,
    typingUsers,
  }

  return { state, sendMessage, sendTyping, subscribe, connect }
}