import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('only publishes the latest value after the delay has passed without changes', () => {
  const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
    initialProps: { value: 'a' },
  })

  rerender({ value: 'an' })
  act(() => vi.advanceTimersByTime(299))
  rerender({ value: 'ann' })
  act(() => vi.advanceTimersByTime(299))
  expect(result.current).toBe('a')

  act(() => vi.advanceTimersByTime(1))
  expect(result.current).toBe('ann')
})
