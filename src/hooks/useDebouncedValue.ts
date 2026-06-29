import { useEffect, useState } from 'react';

/**
 * Debounce a value — returns `value` only after `delayMs` of inactivity.
 * Useful for search inputs to avoid filtering on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
