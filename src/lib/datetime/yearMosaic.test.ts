import { describe, expect, it } from 'vitest';
import {
  availableCalendarYears,
  bucketTimestampsByDay,
  createYearMosaic,
  dayKeyFromTimestamp,
  periodForDayKey,
  periodForMonthKey,
  periodForYear,
  rangeForPeriod,
  timestampInPeriod,
} from './yearMosaic';

describe('yearMosaic helpers', () => {
  it('extracts available years in descending order', () => {
    const items = [
      new Date(2024, 0, 1).getTime(),
      new Date(2026, 4, 27).getTime(),
      undefined,
      Number.NaN,
      new Date(2024, 11, 31).getTime(),
      new Date(2025, 6, 10).getTime(),
    ];

    expect(availableCalendarYears(items, (item) => item)).toEqual([2026, 2025, 2024]);
  });

  it('groups finite timestamps by local calendar day', () => {
    const timestamps = [
      new Date(2025, 11, 15, 9).getTime(),
      new Date(2025, 11, 15, 18).getTime(),
      new Date(2025, 11, 16, 8).getTime(),
      Number.NEGATIVE_INFINITY,
    ];

    expect([...bucketTimestampsByDay(timestamps, (timestamp) => timestamp)]).toEqual([
      ['2025-12-15', 2],
      ['2025-12-16', 1],
    ]);
  });

  it('creates a full leap-year grid with month spans and counts', () => {
    const mosaic = createYearMosaic(2024, {
      '2024-01-01': 3,
      '2024-02-29': 2,
      '2024-12-31': 5,
    });

    expect(mosaic.days).toHaveLength(366);
    expect(mosaic.weekCount).toBe(53);
    expect(mosaic.totalCount).toBe(10);
    expect(mosaic.maxDayCount).toBe(5);
    expect(mosaic.days.find((day) => day.key === '2024-02-29')).toMatchObject({
      monthKey: '2024-02',
      count: 2,
    });
    expect(mosaic.months[1]).toMatchObject({ key: '2024-02', count: 2 });
  });

  it('creates half-open ranges for year, month, and day periods', () => {
    const year = periodForYear(2025);
    const month = periodForMonthKey('2025-12');
    const day = periodForDayKey('2025-12-15');

    expect(rangeForPeriod(year)).toEqual({
      startMs: new Date(2025, 0, 1).getTime(),
      endMs: new Date(2026, 0, 1).getTime(),
    });
    expect(month && rangeForPeriod(month)).toEqual({
      startMs: new Date(2025, 11, 1).getTime(),
      endMs: new Date(2026, 0, 1).getTime(),
    });
    expect(day && rangeForPeriod(day)).toEqual({
      startMs: new Date(2025, 11, 15).getTime(),
      endMs: new Date(2025, 11, 16).getTime(),
    });
  });

  it('matches timestamps against selected periods', () => {
    const month = periodForMonthKey('2025-12');
    const day = periodForDayKey('2025-12-15');
    const selectedDay = new Date(2025, 11, 15, 23, 59, 59).getTime();
    const nextDay = new Date(2025, 11, 16).getTime();

    expect(month && timestampInPeriod(selectedDay, month)).toBe(true);
    expect(day && timestampInPeriod(selectedDay, day)).toBe(true);
    expect(day && timestampInPeriod(nextDay, day)).toBe(false);
  });

  it('rejects impossible day keys', () => {
    expect(periodForDayKey('2025-02-30')).toBeUndefined();
    expect(periodForMonthKey('2025-13')).toBeUndefined();
  });

  it('formats timestamp day keys using local calendar dates', () => {
    expect(dayKeyFromTimestamp(new Date(2025, 4, 27, 12).getTime())).toBe('2025-05-27');
  });
});
