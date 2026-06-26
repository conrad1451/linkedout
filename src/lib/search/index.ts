export function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value);
  const tokens = normalized
    .split(/[^\p{Letter}\p{Number}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .map((token) => token.slice(0, 64));
  return [...new Set(tokens)];
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .toLocaleLowerCase();
}
