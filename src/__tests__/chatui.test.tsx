/**
 * Chat UI rendering.
 *
 * Guards the visual/structural decisions that are easy to silently regress:
 * 1. Own messages are a solid, legible bubble; incoming ones are white
 * 2. Only the last bubble in a run carries the tail
 * 3. The composer has no dead microphone button
 * 4. The typing indicator names whoever is typing
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import MessageBubble from '@/components/chat/MessageBubble'
import TypingIndicator from '@/components/chat/TypingIndicator'
import ChatInput from '@/components/chat/ChatInput'
import { BUBBLE_SELF_BG } from '@/components/chat/chatUtils'

const msg = (over: Record<string, any> = {}) => ({
  id: 1,
  business_id: 1,
  from: 5,
  name: 'Kwame Mensah',
  message: 'Hello team',
  sent_at: '2026-01-15T10:30:00.000Z',
  ...over,
})

const tail = (c: HTMLElement) => c.querySelector('span[style]')

// jsdom normalises hex colours to rgb() when it writes them into the style
// attribute, so derive the expected value from the token rather than hardcoding.
const asRgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

describe('MessageBubble', () => {
  it('renders your own message as a solid, legible bubble', () => {
    const { container } = render(<MessageBubble message={msg()} self showSender={false} />)

    const bubble = container.querySelector('.bg-primary')
    expect(bubble).toBeTruthy()
    expect(bubble?.className).toContain('text-white')
    expect(screen.getByText('Hello team')).toBeTruthy()
  })

  it('renders someone else\'s message as a white bubble', () => {
    const { container } = render(<MessageBubble message={msg()} self={false} showSender />)

    expect(container.querySelector('.bg-primary')).toBeNull()
    expect(container.querySelector('.bg-white')).toBeTruthy()
    expect(screen.getByText('Kwame Mensah')).toBeTruthy()
  })

  it('draws the tail on the last bubble of a run, in the bubble colour', () => {
    const { container } = render(<MessageBubble message={msg()} self showSender={false} isLastOfGroup />)

    const el = tail(container)
    expect(el).toBeTruthy()
    expect(el?.getAttribute('style')).toContain(asRgb(BUBBLE_SELF_BG))
  })

  it('omits the tail on a bubble that continues the run', () => {
    const { container } = render(<MessageBubble message={msg()} self showSender={false} isLastOfGroup={false} />)

    expect(tail(container)).toBeNull()
  })

  it('shows a deleted message without a tail', () => {
    const { container } = render(
      <MessageBubble message={msg({ is_deleted: true })} self showSender={false} isLastOfGroup />
    )

    expect(screen.getByText('This message was deleted')).toBeTruthy()
    expect(tail(container)).toBeNull()
  })

  it('never shows an author name on your own message', () => {
    render(<MessageBubble message={msg()} self showSender />)

    expect(screen.queryByText('Kwame Mensah')).toBeNull()
  })
})

describe('TypingIndicator', () => {
  it('names a single person who is typing', () => {
    render(<TypingIndicator name="Kwame Mensah" userId={5} />)
    expect(screen.getByText('Kwame is typing')).toBeTruthy()
  })

  it('lists two people', () => {
    render(
      <TypingIndicator
        name="Kwame Mensah"
        userId={5}
        others={[{ user_id: 6, name: 'Ama Owusu' }]}
      />
    )
    expect(screen.getByText('Kwame and Ama are typing')).toBeTruthy()
  })

  it('falls back when nobody has a name', () => {
    render(<TypingIndicator userId={null} />)
    expect(screen.getByText('Someone is typing')).toBeTruthy()
  })
})

describe('ChatInput', () => {
  const setup = (over: Record<string, any> = {}) => {
    const props = {
      connected: true,
      editing: null,
      onSendText: jest.fn(),
      onSendAttachment: jest.fn(),
      onSaveEdit: jest.fn(),
      onCancelEdit: jest.fn(),
      onTyping: jest.fn(),
      uploadAttachment: jest.fn(),
      ...over,
    }
    render(<ChatInput {...(props as any)} />)
    return props
  }

  it('has no microphone button', () => {
    setup()
    // A permanently disabled control was the tell that this was not a real app.
    expect(screen.queryByLabelText('Microphone')).toBeNull()
    expect(screen.queryByTitle(/Audio messages/i)).toBeNull()
  })

  it('keeps send disabled until there is something to send', () => {
    setup()
    const send = screen.getByLabelText('Send message') as HTMLButtonElement

    expect(send.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Kikou' } })
    expect((screen.getByLabelText('Send message') as HTMLButtonElement).disabled).toBe(false)
  })

  it('sends on Enter and clears the box', () => {
    const props = setup()
    const box = screen.getByLabelText('Message')

    fireEvent.change(box, { target: { value: 'Kikou' } })
    fireEvent.keyDown(box, { key: 'Enter' })

    expect(props.onSendText).toHaveBeenCalledWith('Kikou')
  })

  it('does not send while disconnected', () => {
    setup({ connected: false })
    const send = screen.getByLabelText('Send message') as HTMLButtonElement

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Kikou' } })
    expect(send.disabled).toBe(true)
  })
})