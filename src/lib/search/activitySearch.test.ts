import { describe, expect, it } from 'vitest';
import type { ActivityItem } from '../../features/profile/model';
import {
  activitySearchText,
  itemMatchesSearch,
  parseSearchQuery,
  searchActivities,
  shouldSearchActivity,
  type SearchQuery,
} from './activitySearch';

function item(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: 'post-1',
    kind: 'post',
    date: '2025-06-15',
    text: 'Learning about machine learning and AI pipelines',
    eyebrow: 'Posted',
    ...overrides,
  };
}

describe('activitySearchText', () => {
  it('returns text only when no targetName or headline', () => {
    expect(activitySearchText(item({ text: 'Hello world' }))).toBe('Hello world');
  });

  it('includes targetName and headline', () => {
    expect(
      activitySearchText(
        item({ text: 'My post', targetName: 'Alice', headline: 'Software Engineer' }),
      ),
    ).toBe('My post Alice Software Engineer');
  });

  it('excludes undefined fields', () => {
    expect(
      activitySearchText(item({ text: 'My post', targetName: undefined, headline: undefined })),
    ).toBe('My post');
  });
});

describe('parseSearchQuery', () => {
  it('returns empty for empty/whitespace input', () => {
    expect(parseSearchQuery('')).toEqual({ phrases: [], tokens: [] });
    expect(parseSearchQuery('   ')).toEqual({ phrases: [], tokens: [] });
  });

  it('tokenizes plain keywords', () => {
    const result = parseSearchQuery('machine learning');
    expect(result.phrases).toEqual([]);
    expect(result.tokens).toEqual(['machine', 'learning']);
  });

  it('extracts quoted phrases', () => {
    const result = parseSearchQuery('"machine learning" pipeline');
    expect(result.phrases).toEqual(['machine learning']);
    expect(result.tokens).toEqual(['pipeline']);
  });

  it('handles multiple quoted phrases', () => {
    const result = parseSearchQuery('"deep learning" "neural network"');
    expect(result.phrases).toEqual(['deep learning', 'neural network']);
    expect(result.tokens).toEqual([]);
  });

  it('normalizes quoted phrases (case, diacritics)', () => {
    const result = parseSearchQuery('"José Núñez"');
    expect(result.phrases).toEqual(['jose nunez']);
  });

  it('handles quotes-only input', () => {
    const result = parseSearchQuery('"exact match"');
    expect(result.phrases).toEqual(['exact match']);
    expect(result.tokens).toEqual([]);
  });

  it('handles empty quoted strings', () => {
    const result = parseSearchQuery('"" test');
    expect(result.phrases).toEqual([]);
    expect(result.tokens).toEqual(['test']);
  });

  it('tokenizes diacritics and case', () => {
    const result = parseSearchQuery('José Núñez');
    expect(result.tokens).toEqual(['jose', 'nunez']);
  });
});

describe('itemMatchesSearch', () => {
  it('returns true for empty query', () => {
    const emptyQuery: SearchQuery = { phrases: [], tokens: [] };
    expect(itemMatchesSearch(item({ text: 'anything' }), emptyQuery)).toBe(true);
  });

  it('matches keyword tokens (AND logic)', () => {
    const query: SearchQuery = { phrases: [], tokens: ['machine', 'learning'] };
    expect(itemMatchesSearch(item({ text: 'Learning about machine learning' }), query)).toBe(true);
  });

  it('rejects when one token missing (AND logic)', () => {
    const query: SearchQuery = { phrases: [], tokens: ['machine', 'pipeline'] };
    expect(itemMatchesSearch(item({ text: 'Learning about machine' }), query)).toBe(false);
  });

  it('matches quoted phrase (case-insensitive)', () => {
    const query: SearchQuery = { phrases: ['machine learning'], tokens: [] };
    expect(itemMatchesSearch(item({ text: 'Learning about Machine Learning today' }), query)).toBe(
      true,
    );
  });

  it('rejects missing quoted phrase', () => {
    const query: SearchQuery = { phrases: ['deep learning'], tokens: [] };
    expect(itemMatchesSearch(item({ text: 'Learning about machine learning' }), query)).toBe(false);
  });

  it('matches quoted phrase with diacritics in item', () => {
    const query: SearchQuery = { phrases: ['jose nunez'], tokens: [] };
    expect(itemMatchesSearch(item({ text: 'José Núñez wrote this' }), query)).toBe(true);
  });

  it('matches mixed phrases and tokens (both must match)', () => {
    const query: SearchQuery = { phrases: ['machine learning'], tokens: ['pipeline'] };
    expect(
      itemMatchesSearch(item({ text: 'Machine learning pipeline for data processing' }), query),
    ).toBe(true);
  });

  it('rejects when phrase matches but token does not', () => {
    const query: SearchQuery = { phrases: ['machine learning'], tokens: ['cloud'] };
    expect(
      itemMatchesSearch(item({ text: 'Machine learning pipeline for data processing' }), query),
    ).toBe(false);
  });

  it('searches targetName', () => {
    const query: SearchQuery = { phrases: [], tokens: ['alice'] };
    expect(itemMatchesSearch(item({ text: 'My post', targetName: 'Alice Smith' }), query)).toBe(
      true,
    );
  });

  it('searches headline', () => {
    const query: SearchQuery = { phrases: [], tokens: ['engineer'] };
    expect(itemMatchesSearch(item({ text: 'My post', headline: 'Software Engineer' }), query)).toBe(
      true,
    );
  });

  it('filters tokens with <2 chars', () => {
    // tokenizeSearchText filters tokens < 2 chars, so "a" won't produce a token
    const query: SearchQuery = { phrases: [], tokens: ['a'] };
    // The query would have token "a" because parseSearchQuery doesn't filter length,
    // but tokenizeSearchText does filter on the item side. So "a" won't be in the
    // item's token set, and the match will fail.
    expect(itemMatchesSearch(item({ text: 'This is a test' }), query)).toBe(false);
  });

  it('rejects reactions even if text would match', () => {
    const query: SearchQuery = { phrases: [], tokens: ['reacted'] };
    expect(
      itemMatchesSearch(
        item({ kind: 'reaction', text: 'Reacted to a post about machine learning' }),
        query,
      ),
    ).toBe(false);
  });

  it('rejects reposts even if text would match', () => {
    const query: SearchQuery = { phrases: [], tokens: ['reposted'] };
    expect(itemMatchesSearch(item({ kind: 'repost', text: 'Reposted an update' }), query)).toBe(
      false,
    );
  });

  it('rejects saved items', () => {
    const query: SearchQuery = { phrases: [], tokens: ['saved'] };
    expect(
      itemMatchesSearch(item({ kind: 'saved-item', text: 'Saved a LinkedIn item' }), query),
    ).toBe(false);
  });

  it('rejects rich-media with no description (fallback text)', () => {
    const query: SearchQuery = { phrases: [], tokens: ['media'] };
    expect(itemMatchesSearch(item({ kind: 'rich-media', text: 'Media' }), query)).toBe(false);
  });

  it('searches rich-media with an actual description', () => {
    const query: SearchQuery = { phrases: [], tokens: ['photo'] };
    expect(
      itemMatchesSearch(item({ kind: 'rich-media', text: 'Photo from conference' }), query),
    ).toBe(true);
  });
});

describe('shouldSearchActivity', () => {
  it('returns true for posts, comments, messages', () => {
    expect(shouldSearchActivity(item({ kind: 'post' }))).toBe(true);
    expect(shouldSearchActivity(item({ kind: 'comment' }))).toBe(true);
    expect(shouldSearchActivity(item({ kind: 'message' }))).toBe(true);
  });

  it('returns false for reactions, reposts, saved-items', () => {
    expect(shouldSearchActivity(item({ kind: 'reaction' }))).toBe(false);
    expect(shouldSearchActivity(item({ kind: 'repost' }))).toBe(false);
    expect(shouldSearchActivity(item({ kind: 'saved-item' }))).toBe(false);
  });

  it('returns false for rich-media with fallback text', () => {
    expect(shouldSearchActivity(item({ kind: 'rich-media', text: 'Media' }))).toBe(false);
  });

  it('returns true for rich-media with actual description', () => {
    expect(shouldSearchActivity(item({ kind: 'rich-media', text: 'Chart from Q4 report' }))).toBe(
      true,
    );
  });
});

describe('searchActivities', () => {
  const items: ActivityItem[] = [
    item({ id: 'post-1', text: 'Learning about machine learning and AI' }),
    item({ id: 'post-2', text: 'Deep neural network pipelines' }),
    item({ id: 'post-3', text: 'My notes on reinforcement learning' }),
  ];

  it('returns all items for empty query', () => {
    expect(searchActivities(items, '')).toHaveLength(3);
    expect(searchActivities(items, '   ')).toHaveLength(3);
  });

  it('filters by keywords', () => {
    const result = searchActivities(items, 'learning');
    expect(result.map((i) => i.id)).toEqual(['post-1', 'post-3']);
  });

  it('filters by quoted phrase', () => {
    const result = searchActivities(items, '"machine learning"');
    expect(result.map((i) => i.id)).toEqual(['post-1']);
  });

  it('returns empty when nothing matches', () => {
    const result = searchActivities(items, 'blockchain');
    expect(result).toHaveLength(0);
  });

  it('handles mixed phrase + keyword', () => {
    const items2: ActivityItem[] = [
      item({ id: 'a', text: 'Machine learning pipeline with deep neural nets' }),
      item({ id: 'b', text: 'Machine learning for beginners' }),
      item({ id: 'c', text: 'My pipeline project' }),
    ];
    const result = searchActivities(items2, '"machine learning" pipeline');
    expect(result.map((i) => i.id)).toEqual(['a']);
  });

  it('excludes non-searchable kinds from results', () => {
    const mixed: ActivityItem[] = [
      item({ id: 'post-1', kind: 'post', text: 'My machine learning post' }),
      item({ id: 'react-1', kind: 'reaction', text: 'Reacted with machine learning' }),
      item({ id: 'repost-1', kind: 'repost', text: 'Reposted machine learning' }),
      item({ id: 'saved-1', kind: 'saved-item', text: 'Saved machine learning item' }),
    ];
    const result = searchActivities(mixed, 'machine learning');
    expect(result.map((i) => i.id)).toEqual(['post-1']);
  });
});
