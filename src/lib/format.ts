export function formatCompactCount(count: number): string {
  if (count < 1000) return count.toLocaleString();
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(count);
}
