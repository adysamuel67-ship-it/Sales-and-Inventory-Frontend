/**
 * Hook Lifecycle Tests
 *
 * Regression coverage for useDebouncedCallback: a pending debounced call must
 * not fire after the component unmounts.
 */

import { renderHook, act } from '@testing-library/react'
import { useDebouncedCallback } from '@/lib/hooks'

describe('useDebouncedCallback', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('invokes the callback once after the delay', () => {
    const spy = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(spy, 300))

    act(() => { result.current('a') })
    expect(spy).not.toHaveBeenCalled()

    act(() => { jest.advanceTimersByTime(300) })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('a')
  })

  it('collapses rapid calls into a single invocation with the latest args', () => {
    const spy = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(spy, 300))

    act(() => {
      result.current('first')
      jest.advanceTimersByTime(100)
      result.current('second')
      jest.advanceTimersByTime(100)
      result.current('third')
    })
    act(() => { jest.advanceTimersByTime(300) })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('third')
  })

  it('does not fire the callback after unmount', () => {
    const spy = jest.fn()
    const { result, unmount } = renderHook(() => useDebouncedCallback(spy, 300))

    act(() => { result.current('pending') })
    unmount()

    act(() => { jest.advanceTimersByTime(1000) })

    expect(spy).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(0)
  })
})