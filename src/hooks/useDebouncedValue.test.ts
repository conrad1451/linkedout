import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update before delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'hello', delay: 300 },
    });

    rerender({ value: 'world', delay: 300 });

    // Before timer fires, still old value
    expect(result.current).toBe('hello');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('hello');
  });

  it('updates after delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'hello', delay: 300 },
    });

    rerender({ value: 'world', delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('world');
  });

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'a', delay: 300 },
    });

    // Type "ab" rapidly
    rerender({ value: 'ab', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Before first timer fires, type "abc"
    rerender({ value: 'abc', delay: 300 });
    expect(result.current).toBe('a'); // still initial

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a'); // first timer would have fired but was reset

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('abc'); // second timer fires
  });

  it('returns same value if unchanged', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'hello', delay: 300 },
    });

    rerender({ value: 'hello', delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('hello');
  });
});
