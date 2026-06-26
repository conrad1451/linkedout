import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RelativeTimeText } from './RelativeTimeText';

describe('RelativeTimeText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders relative text with an absolute tooltip and datetime attribute', () => {
    const value = new Date('2026-06-24T08:30:00Z');

    render(<RelativeTimeText value={value} />);

    const time = screen.getByText('yesterday');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', value.toISOString());
    expect(time).toHaveAttribute(
      'title',
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(value),
    );
  });

  it('supports prefixes for inline timestamp copy', () => {
    const value = Date.parse('2026-06-18T12:00:00Z');

    render(<RelativeTimeText value={value} prefix="Imported" />);

    expect(screen.getByText('Imported last week')).toBeInTheDocument();
  });
});
