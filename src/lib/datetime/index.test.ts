import { describe, expect, it } from 'vitest';
import { parseTemporalValue } from './index';

describe('parseTemporalValue', () => {
  it('normalizes UTC date-time values', () => {
    const parsed = parseTemporalValue('2025-12-16 08:51:08 UTC');

    expect(parsed).toMatchObject({ precision: 'date-time', zone: 'utc' });
    expect(parsed?.epochMs).toBe(Date.UTC(2025, 11, 16, 8, 51, 8));
  });

  it('normalizes local date-time values', () => {
    const parsed = parseTemporalValue('3/22/12, 5:55 AM');

    expect(parsed).toMatchObject({ precision: 'date-time', zone: 'local' });
    expect(parsed?.epochMs).toBe(new Date(2012, 2, 22, 5, 55, 0).getTime());
  });

  it('normalizes weekday UTC date-time values used by company follows', () => {
    const parsed = parseTemporalValue('Mon Apr 25 07:27:31 UTC 2011');

    expect(parsed).toMatchObject({ precision: 'date-time', zone: 'utc' });
    expect(parsed?.epochMs).toBe(Date.UTC(2011, 3, 25, 7, 27, 31));
  });

  it('normalizes date-only values', () => {
    const parsed = parseTemporalValue('16 Dec 2025');

    expect(parsed).toMatchObject({ precision: 'date', zone: 'local' });
    expect(parsed?.epochMs).toBe(new Date(2025, 11, 16).getTime());
  });

  it('normalizes month and year precision values', () => {
    expect(parseTemporalValue('Mar 2013')).toMatchObject({ precision: 'month' });
    expect(parseTemporalValue('2010')).toMatchObject({ precision: 'year' });
  });

  it('extracts date-times from LinkedIn rich media prose', () => {
    const parsed = parseTemporalValue(
      'You uploaded a feed document on July 1, 2024 at 9:39 AM (GMT)',
    );

    expect(parsed).toMatchObject({ precision: 'date-time', zone: 'utc' });
    expect(parsed?.epochMs).toBe(Date.UTC(2024, 6, 1, 9, 39, 0));
  });

  it('uses the first instant from date range strings', () => {
    const parsed = parseTemporalValue('Jun 16, 2023 10:00 AM - Jun 16, 2023 11:00 AM');

    expect(parsed).toMatchObject({ precision: 'date-time', zone: 'local' });
    expect(parsed?.epochMs).toBe(new Date(2023, 5, 16, 10, 0, 0).getTime());
  });

  it('normalizes time-only values without inventing a date', () => {
    const parsed = parseTemporalValue('9:30 PM');

    expect(parsed).toMatchObject({ precision: 'time', timeMs: 77_400_000 });
    expect(parsed?.epochMs).toBeUndefined();
  });
});
