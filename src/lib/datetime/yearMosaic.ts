export interface YearMosaicDay {
  key: string;
  monthKey: string;
  date: Date;
  year: number;
  monthIndex: number;
  dayOfMonth: number;
  weekdayIndex: number;
  weekIndex: number;
  count: number;
}

export interface YearMosaicMonth {
  key: string;
  year: number;
  monthIndex: number;
  startWeek: number;
  endWeek: number;
  count: number;
}

export interface YearMosaicGrid {
  year: number;
  weekCount: number;
  days: YearMosaicDay[];
  months: YearMosaicMonth[];
  totalCount: number;
  maxDayCount: number;
}

export type TemporalMosaicPeriod =
  | { kind: 'year'; year: number }
  | { kind: 'month'; key: string; year: number; monthIndex: number }
  | { kind: 'day'; key: string; year: number; monthIndex: number; dayOfMonth: number };

export interface TemporalMosaicRange {
  startMs: number;
  endMs: number;
}

type CountSource = ReadonlyMap<string, number> | Readonly<Record<string, number>>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function availableCalendarYears<T>(
  items: readonly T[],
  timestampFor: (item: T) => number | undefined,
): number[] {
  const years = new Set<number>();

  for (const item of items) {
    const timestamp = timestampFor(item);
    if (!isFiniteTimestamp(timestamp)) continue;
    years.add(new Date(timestamp).getFullYear());
  }

  return [...years].sort((left, right) => right - left);
}

export function bucketTimestampsByDay<T>(
  items: readonly T[],
  timestampFor: (item: T) => number | undefined,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    const timestamp = timestampFor(item);
    if (!isFiniteTimestamp(timestamp)) continue;
    const key = dayKeyFromTimestamp(timestamp);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export function createYearMosaic(year: number, countsByDay: CountSource = {}): YearMosaicGrid {
  const startWeekday = new Date(year, 0, 1).getDay();
  const daysInSelectedYear = daysInYear(year);
  const weekCount = Math.ceil((startWeekday + daysInSelectedYear) / 7);
  const days: YearMosaicDay[] = [];
  let totalCount = 0;
  let maxDayCount = 0;

  for (let dayOffset = 0; dayOffset < daysInSelectedYear; dayOffset += 1) {
    const date = new Date(year, 0, dayOffset + 1);
    const key = dayKeyFromDate(date);
    const count = countForKey(countsByDay, key);
    totalCount += count;
    maxDayCount = Math.max(maxDayCount, count);

    days.push({
      key,
      monthKey: monthKeyFromDate(date),
      date,
      year,
      monthIndex: date.getMonth(),
      dayOfMonth: date.getDate(),
      weekdayIndex: date.getDay(),
      weekIndex: Math.floor((startWeekday + dayOffset) / 7),
      count,
    });
  }

  const months = Array.from({ length: 12 }, (_, monthIndex): YearMosaicMonth => {
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const key = formatMonthKey(year, monthIndex);
    const count = days
      .filter((day) => day.monthIndex === monthIndex)
      .reduce((sum, day) => sum + day.count, 0);

    return {
      key,
      year,
      monthIndex,
      startWeek: weekIndexForDate(year, firstDay),
      endWeek: weekIndexForDate(year, lastDay),
      count,
    };
  });

  return { year, weekCount, days, months, totalCount, maxDayCount };
}

export function periodForYear(year: number): TemporalMosaicPeriod {
  return { kind: 'year', year };
}

export function periodForMonthKey(key: string): TemporalMosaicPeriod | undefined {
  const parsed = parseMonthKey(key);
  if (!parsed) return undefined;
  return { kind: 'month', key, year: parsed.year, monthIndex: parsed.monthIndex };
}

export function periodForDayKey(key: string): TemporalMosaicPeriod | undefined {
  const parsed = parseDayKey(key);
  if (!parsed) return undefined;
  return {
    kind: 'day',
    key,
    year: parsed.year,
    monthIndex: parsed.monthIndex,
    dayOfMonth: parsed.dayOfMonth,
  };
}

export function rangeForPeriod(period: TemporalMosaicPeriod): TemporalMosaicRange {
  if (period.kind === 'year') {
    return {
      startMs: new Date(period.year, 0, 1).getTime(),
      endMs: new Date(period.year + 1, 0, 1).getTime(),
    };
  }

  if (period.kind === 'month') {
    return {
      startMs: new Date(period.year, period.monthIndex, 1).getTime(),
      endMs: new Date(period.year, period.monthIndex + 1, 1).getTime(),
    };
  }

  return {
    startMs: new Date(period.year, period.monthIndex, period.dayOfMonth).getTime(),
    endMs: new Date(period.year, period.monthIndex, period.dayOfMonth + 1).getTime(),
  };
}

export function timestampInPeriod(
  timestamp: number | undefined,
  period: TemporalMosaicPeriod,
): boolean {
  if (!isFiniteTimestamp(timestamp)) return false;
  const range = rangeForPeriod(period);
  return timestamp >= range.startMs && timestamp < range.endMs;
}

export function formatMonthKey(year: number, monthIndex: number): string {
  return `${year}-${pad2(monthIndex + 1)}`;
}

export function formatDayKey(year: number, monthIndex: number, dayOfMonth: number): string {
  return `${formatMonthKey(year, monthIndex)}-${pad2(dayOfMonth)}`;
}

export function dayKeyFromDate(date: Date): string {
  return formatDayKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayKeyFromTimestamp(timestamp: number): string {
  return dayKeyFromDate(new Date(timestamp));
}

export function monthKeyFromDate(date: Date): string {
  return formatMonthKey(date.getFullYear(), date.getMonth());
}

export function monthKeyFromTimestamp(timestamp: number): string {
  return monthKeyFromDate(new Date(timestamp));
}

export function parseMonthKey(
  key: string,
): { key: string; year: number; monthIndex: number } | undefined {
  const match = key.match(/^(\d{4})-(\d{2})$/);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return undefined;

  return { key, year, monthIndex: month - 1 };
}

export function parseDayKey(
  key: string,
): { key: string; year: number; monthIndex: number; dayOfMonth: number; date: Date } | undefined {
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const dayOfMonth = Number(match[3]);
  const date = new Date(year, month - 1, dayOfMonth);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== dayOfMonth
  ) {
    return undefined;
  }

  return { key, year, monthIndex: month - 1, dayOfMonth, date };
}

function countForKey(source: CountSource, key: string): number {
  if (isCountMap(source)) return source.get(key) ?? 0;
  return source[key] ?? 0;
}

function isCountMap(source: CountSource): source is ReadonlyMap<string, number> {
  return typeof (source as ReadonlyMap<string, number>).get === 'function';
}

function daysInYear(year: number): number {
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}

function weekIndexForDate(year: number, date: Date): number {
  const startWeekday = new Date(year, 0, 1).getDay();
  const dayOffset =
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(year, 0, 1)) /
    MS_PER_DAY;
  return Math.floor((startWeekday + dayOffset) / 7);
}

function isFiniteTimestamp(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
