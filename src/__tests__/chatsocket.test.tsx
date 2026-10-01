/**
 * Chat Socket Lifecycle Tests
 *
 * Regression coverage for the unmount race in useChatSocket: when the
 * component unmounts while `chatAPI.wsTicket` is still in flight, the
 * resolved ticket must not open a WebSocket. The cleanup effect has
 * already run (wsRef is null) so the connection would never be closed.
 */

import { render, act } from '@testing-library/react'
import { useChatSocket } from '@/components/chat/useChatSocket'
import { chatAPI } from '@/lib/api'

jest.mock('@/lib/api', () => ({
  chatAPI: { wsTicket: jest.fn() },
  chatWebSocketUrl: jest.fn((id: number, ticket: string) => `ws://test/${id}?t=${ticket}`),
}))

class MockWebSocket {
  static instances: MockWebSocket[] = []
  readyState = 0
  onopen: (() => void) | null = null
  onmessage: ((e: any) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  close = jest.fn()
  send = jest.fn()
  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }
}

function Probe({ businessId, selfUserId }: { businessId: number; selfUserId: number | null }) {
  useChatSocket(businessId, selfUserId)
  return null
}

describe('useChatSocket unmount during ticket fetch', () => {
  let originalWS: any

  beforeEach(() => {
    MockWebSocket.instances = []
    ;(chatAPI.wsTicket as jest.Mock).mockReset()
    originalWS = (global as any).WebSocket
    ;(global as any).WebSocket = MockWebSocket
  })

  afterEach(() => {
    ;(global as any).WebSocket = originalWS
  })

  it('does not open a WebSocket when the ticket resolves after unmount', async () => {
    // Deferred so we can unmount while the request is still pending.
    let resolveTicket: (v: any) => void = () => {}
    ;(chatAPI.wsTicket as jest.Mock).mockImplementation(
      () => new Promise((resolve) => { resolveTicket = resolve })
    )

    const { unmount } = render(<Probe businessId={7} selfUserId={42} />)

    // Unmount while wsTicket is still pending.
    unmount()

    await act(async () => {
      resolveTicket({ data: { ticket: 'late-ticket' } })
    })

    expect(chatAPI.wsTicket).toHaveBeenCalledTimes(1)
    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it('still connects normally when the component stays mounted', async () => {
    ;(chatAPI.wsTicket as jest.Mock).mockResolvedValue({ data: { ticket: 'good-ticket' } })

    render(<Probe businessId={7} selfUserId={42} />)

    await act(async () => {})

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe('ws://test/7?t=good-ticket')
  })

  it('closes an established socket on unmount', async () => {
    ;(chatAPI.wsTicket as jest.Mock).mockResolvedValue({ data: { ticket: 'good-ticket' } })

    const { unmount } = render(<Probe businessId={7} selfUserId={42} />)
    await act(async () => {})

    const ws = MockWebSocket.instances[0]
    unmount()

    expect(ws.close).toHaveBeenCalled()
  })
})