type RelativeTimeTextProps = {
  value: Date | number | string;
  className?: string;
  prefix?: string;
  title?: string;
  dateTime?: string;
};

export function RelativeTimeText({
  value,
  className,
  prefix,
  title,
  dateTime,
}: RelativeTimeTextProps) {
  const date = coerceDate(value);
  if (!date) return null;

  const relative = formatRelativeDate(date);
  if (!relative) return null;

  return (
    <time
      dateTime={dateTime ?? date.toISOString()}
      title={title ?? formatAbsoluteDateTime(date)}
      className={className}
    >
      {prefix ? `${prefix} ${relative}` : relative}
    </time>
  );
}

function coerceDate(value: Date | number | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatAbsoluteDateTime(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(value);
}

function formatRelativeDate(target: Date): string {
  const now = new Date();
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const comparison = target.getTime() <= now.getTime() ? -1 : 1;
  const months = fullMonthDistance(target, now);

  if (months >= 12) return formatter.format(comparison * Math.floor(months / 12), 'year');
  if (months >= 1) return formatter.format(comparison * months, 'month');

  const dayDistance = Math.max(0, Math.round(dayDistanceBetween(target, now)));
  if (dayDistance >= 7) return formatter.format(comparison * Math.floor(dayDistance / 7), 'week');
  return formatter.format(comparison * dayDistance, 'day');
}

function fullMonthDistance(left: Date, right: Date): number {
  const earlier = left.getTime() <= right.getTime() ? left : right;
  const later = left.getTime() <= right.getTime() ? right : left;
  let months = (later.getFullYear() - earlier.getFullYear()) * 12;
  months += later.getMonth() - earlier.getMonth();
  if (later.getDate() < earlier.getDate()) months -= 1;
  return Math.max(0, months);
}

function dayDistanceBetween(left: Date, right: Date): number {
  return Math.abs(startOfDay(right).getTime() - startOfDay(left).getTime()) / 86_400_000;
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
