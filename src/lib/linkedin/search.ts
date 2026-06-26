export function linkedInHashtagSearchUrl(hashtag: string): string | undefined {
  const normalized = hashtag.trim().replace(/^#+/, '');
  if (!normalized) return undefined;

  const keyword = encodeURIComponent(`#${normalized}`);
  return `https://www.linkedin.com/search/results/all/?keywords=${keyword}&origin=HASH_TAG_FROM_FEED`;
}
