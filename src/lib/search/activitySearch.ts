import type { ActivityItem } from '../../features/profile/model';
import { normalizeSearchText, tokenizeSearchText } from './index';

/**
 * Parsed search query with quoted phrases (exact match) and tokenized keywords.
 */
export interface SearchQuery {
  /** Quoted phrases — normalized, matched via .includes on the target text. */
  phrases: string[];
  /** Free-text keywords — tokenized via tokenizeSearchText, matched as AND. */
  tokens: string[];
}

/**
 * Collect the searchable fields from an ActivityItem into a single string.
 * Searches: text, targetName, and headline.  Links/URLs are never searched.
 */
export function activitySearchText(item: ActivityItem): string {
  return [item.text, item.targetName, item.headline].filter(Boolean).join(' ');
}

/**
 * Activity kinds that have no meaningful text content to search.
 *
 * - reactions: only reaction type metadata, no user-authored text
 * - reposts: instant reposts have no description, only URLs
 * - saved-items: only bookmark links, no description
 * - rich-media: only searchable when it has an actual description
 *   (otherwise text is the fallback "Media")
 */
const NON_SEARCHABLE_KINDS: ReadonlySet<ActivityItem['kind']> = new Set([
  'reaction',
  'repost',
  'saved-item',
]);

/**
 * Returns true if this activity item has meaningful text that should be
 * matched by a search query.
 */
export function shouldSearchActivity(item: ActivityItem): boolean {
  if (NON_SEARCHABLE_KINDS.has(item.kind)) return false;
  // Rich media with no description has the fallback text "Media"
  if (item.kind === 'rich-media' && item.text === 'Media') return false;
  return true;
}

/**
 * Parse a raw search string into a structured SearchQuery.
 *
 * - Text inside double quotes (") → exact phrase (normalized, matched via .includes)
 * - All other text → tokenized via tokenizeSearchText for keyword AND matching
 */
export function parseSearchQuery(raw: string): SearchQuery {
  const trimmed = raw.trim();
  if (!trimmed) return { phrases: [], tokens: [] };

  const phrases: string[] = [];
  const remainingParts: string[] = [];

  // Extract quoted phrases
  const quoteRegex = /"([^"]*)"/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = quoteRegex.exec(trimmed)) !== null) {
    // Text before this quote becomes keywords
    if (match.index > lastIndex) {
      remainingParts.push(trimmed.slice(lastIndex, match.index));
    }
    const captured = match[1]?.trim();
    if (captured) {
      phrases.push(normalizeSearchText(captured));
    }
    lastIndex = match.index + match[0].length;
  }
  // Remaining text after the last quote
  if (lastIndex < trimmed.length) {
    remainingParts.push(trimmed.slice(lastIndex));
  }

  const keywordsText = remainingParts.join(' ').trim();
  const tokens = keywordsText ? tokenizeSearchText(keywordsText) : [];

  return { phrases, tokens };
}

/**
 * Check whether an ActivityItem matches a parsed SearchQuery.
 *
 * ALL phrases must be found (via normalized .includes) AND
 * ALL keyword tokens must be found (via tokenization match).
 *
 * Returns true if the query is empty (no phrases, no tokens).
 */
export function itemMatchesSearch(item: ActivityItem, query: SearchQuery): boolean {
  if (query.phrases.length === 0 && query.tokens.length === 0) return true;
  if (!shouldSearchActivity(item)) return false;

  const searchText = normalizeSearchText(activitySearchText(item));

  // Every quoted phrase must appear (case-insensitive, diacritic-stripped)
  for (const phrase of query.phrases) {
    if (!searchText.includes(phrase)) return false;
  }

  // Every keyword token must match
  if (query.tokens.length > 0) {
    const itemTokens = tokenizeSearchText(searchText);
    const tokenSet = new Set(itemTokens);
    for (const token of query.tokens) {
      if (!tokenSet.has(token)) return false;
    }
  }

  return true;
}

/**
 * Filter an array of ActivityItems by a raw search query string.
 * Returns all items if the query is empty/whitespace.
 */
export function searchActivities(items: ActivityItem[], raw: string): ActivityItem[] {
  const trimmed = raw.trim();
  if (!trimmed) return items;

  const query = parseSearchQuery(trimmed);
  return items.filter((item) => itemMatchesSearch(item, query));
}
