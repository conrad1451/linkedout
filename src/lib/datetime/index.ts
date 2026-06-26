export type TemporalPrecision = 'date-time' | 'date' | 'month' | 'year' | 'time';

export interface NormalizedTemporal {
  raw: string;
  precision: TemporalPrecision;
  epochMs?: number;
  timeMs?: number;
  zone?: 'local' | 'utc';
}

const MONTHS = new Map([
  ['jan', 0],
  ['january', 0],
  ['feb', 1],
  ['february', 1],
  ['mar', 2],
  ['march', 2],
  ['apr', 3],
  ['april', 3],
  ['may', 4],
  ['jun', 5],
  ['june', 5],
  ['jul', 6],
  ['july', 6],
  ['aug', 7],
  ['august', 7],
  ['sep', 8],
  ['sept', 8],
  ['september', 8],
  ['oct', 9],
  ['october', 9],
  ['nov', 10],
  ['november', 10],
  ['dec', 11],
  ['december', 11],
]);

const MONTH_PATTERN =
  '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';

const ISO_DATE_TIME_RE =
  /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?(?:\s*(UTC|GMT|Z))?$/i;
const SHORT_DATE_TIME_RE =
  /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)(?:\s*(UTC|GMT))?$/i;
const WEEKDAY_UTC_RE = new RegExp(
  `^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\s+${MONTH_PATTERN}\\s+(\\d{1,2})\\s+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s+(UTC|GMT)\\s+(\\d{4})$`,
  'i',
);
const MONTH_DATE_RE = new RegExp(
  `^${MONTH_PATTERN}\\s+(\\d{1,2}),?\\s+(\\d{4})(?:\\s+(?:at\\s+)?(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s*(AM|PM)(?:\\s*\\(?(UTC|GMT)\\)?)?)?$`,
  'i',
);
const DAY_MONTH_DATE_RE = new RegExp(`^(\\d{1,2})\\s+${MONTH_PATTERN}\\s+(\\d{4})$`, 'i');
const MONTH_YEAR_RE = new RegExp(`^${MONTH_PATTERN}\\s+(\\d{4})$`, 'i');
const TIME_ONLY_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i;

export function parseTemporalValue(value: string): NormalizedTemporal | undefined {
  const raw = value.trim();
  if (!raw) return undefined;

  const candidate = firstRangePart(raw);
  const prose = extractProseTemporal(candidate);
  const clean = prose ?? candidate;

  const iso = clean.match(ISO_DATE_TIME_RE);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const hour = iso[4] === undefined ? undefined : Number(iso[4]);
    const minute = iso[5] === undefined ? undefined : Number(iso[5]);
    const second = Number(iso[6] ?? 0);
    const zone =
      iso[7]?.toUpperCase() === 'UTC' ||
      iso[7]?.toUpperCase() === 'GMT' ||
      iso[7]?.toUpperCase() === 'Z'
        ? 'utc'
        : 'local';
    if (hour === undefined || minute === undefined) return dateTemporal(raw, year, month, day);
    return dateTimeTemporal(raw, year, month, day, hour, minute, second, zone);
  }

  const short = clean.match(SHORT_DATE_TIME_RE);
  if (short) {
    const year = expandYear(Number(short[3]));
    const hour = hour24(Number(short[4]), short[7] ?? 'AM');
    const zone =
      short[8]?.toUpperCase() === 'UTC' || short[8]?.toUpperCase() === 'GMT' ? 'utc' : 'local';
    return dateTimeTemporal(
      raw,
      year,
      Number(short[1]),
      Number(short[2]),
      hour,
      Number(short[5]),
      Number(short[6] ?? 0),
      zone,
    );
  }

  const weekday = clean.match(WEEKDAY_UTC_RE);
  if (weekday) {
    const month = monthNumber(weekday[1]);
    if (month === undefined) return undefined;
    return dateTimeTemporal(
      raw,
      Number(weekday[7]),
      month + 1,
      Number(weekday[2]),
      Number(weekday[3]),
      Number(weekday[4]),
      Number(weekday[5] ?? 0),
      'utc',
    );
  }

  const monthDate = clean.match(MONTH_DATE_RE);
  if (monthDate) {
    const month = monthNumber(monthDate[1]);
    if (month === undefined) return undefined;
    const year = Number(monthDate[3]);
    const day = Number(monthDate[2]);
    if (monthDate[4] === undefined) return dateTemporal(raw, year, month + 1, day);
    const zone =
      monthDate[8]?.toUpperCase() === 'UTC' || monthDate[8]?.toUpperCase() === 'GMT'
        ? 'utc'
        : 'local';
    return dateTimeTemporal(
      raw,
      year,
      month + 1,
      day,
      hour24(Number(monthDate[4]), monthDate[7] ?? 'AM'),
      Number(monthDate[5]),
      Number(monthDate[6] ?? 0),
      zone,
    );
  }

  const dayMonth = clean.match(DAY_MONTH_DATE_RE);
  if (dayMonth) {
    const month = monthNumber(dayMonth[2]);
    if (month === undefined) return undefined;
    return dateTemporal(raw, Number(dayMonth[3]), month + 1, Number(dayMonth[1]));
  }

  const monthYear = clean.match(MONTH_YEAR_RE);
  if (monthYear) {
    const month = monthNumber(monthYear[1]);
    if (month === undefined) return undefined;
    const year = Number(monthYear[2]);
    const epochMs = localEpoch(year, month + 1, 1, 0, 0, 0);
    if (epochMs === undefined) return undefined;
    return { raw, precision: 'month', epochMs, zone: 'local' };
  }

  if (/^\d{4}$/.test(clean)) {
    const year = Number(clean);
    if (year < 1900 || year > 2200) return undefined;
    const epochMs = localEpoch(year, 1, 1, 0, 0, 0);
    if (epochMs === undefined) return undefined;
    return { raw, precision: 'year', epochMs, zone: 'local' };
  }

  const time = clean.match(TIME_ONLY_RE);
  if (time) {
    const hour = time[4] ? hour24(Number(time[1]), time[4]) : Number(time[1]);
    const minute = Number(time[2]);
    const second = Number(time[3] ?? 0);
    if (!validTime(hour, minute, second)) return undefined;
    return {
      raw,
      precision: 'time',
      timeMs: ((hour * 60 + minute) * 60 + second) * 1000,
      zone: 'local',
    };
  }

  return undefined;
}

export function formatTemporal(temporal: NormalizedTemporal | undefined, fallback = ''): string {
  if (!temporal) return fallback;
  try {
    if (temporal.precision === 'time' && temporal.timeMs !== undefined) {
      const seconds = Math.floor(temporal.timeMs / 1000);
      const date = new Date(
        1970,
        0,
        1,
        Math.floor(seconds / 3600),
        Math.floor((seconds % 3600) / 60),
        seconds % 60,
      );
      return new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' }).format(date);
    }
    if (temporal.epochMs === undefined) return fallback || temporal.raw;
    const date = new Date(temporal.epochMs);
    if (temporal.precision === 'year') {
      return new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(date);
    }
    if (temporal.precision === 'month') {
      return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(date);
    }
    if (temporal.precision === 'date') {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
    }
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(
      date,
    );
  } catch {
    return fallback || temporal.raw;
  }
}

function firstRangePart(value: string): string {
  const separator = value.indexOf(' - ');
  return separator === -1 ? value : value.slice(0, separator).trim();
}

function extractProseTemporal(value: string): string | undefined {
  const match = value.match(
    new RegExp(
      `${MONTH_PATTERN}\\s+\\d{1,2},\\s+\\d{4}\\s+at\\s+\\d{1,2}:\\d{2}(?::\\d{2})?\\s*(?:AM|PM)\\s*\\((?:GMT|UTC)\\)`,
      'i',
    ),
  );
  return match?.[0];
}

function dateTemporal(
  raw: string,
  year: number,
  month: number,
  day: number,
): NormalizedTemporal | undefined {
  const epochMs = localEpoch(year, month, day, 0, 0, 0);
  if (epochMs === undefined) return undefined;
  return { raw, precision: 'date', epochMs, zone: 'local' };
}

function dateTimeTemporal(
  raw: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  zone: 'local' | 'utc',
): NormalizedTemporal | undefined {
  const epochMs =
    zone === 'utc'
      ? utcEpoch(year, month, day, hour, minute, second)
      : localEpoch(year, month, day, hour, minute, second);
  if (epochMs === undefined) return undefined;
  return { raw, precision: 'date-time', epochMs, zone };
}

function localEpoch(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): number | undefined {
  if (!validTime(hour, minute, second)) return undefined;
  const date = new Date(year, month - 1, day, hour, minute, second, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return undefined;
  if (date.getHours() !== hour || date.getMinutes() !== minute || date.getSeconds() !== second)
    return undefined;
  return date.getTime();
}

function utcEpoch(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): number | undefined {
  if (!validTime(hour, minute, second)) return undefined;
  const epochMs = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const date = new Date(epochMs);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return undefined;
  if (
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  )
    return undefined;
  return epochMs;
}

function validTime(hour: number, minute: number, second: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}

function monthNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  return MONTHS.get(value.toLowerCase());
}

function hour24(hour: number, meridiem: string): number {
  const normalized = meridiem.toUpperCase();
  if (normalized === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function expandYear(year: number): number {
  if (year >= 100) return year;
  return year < 70 ? 2000 + year : 1900 + year;
}
