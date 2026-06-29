# Search Feature Notes

This file documents how the free-form search works on the Activity page so future agents can maintain consistency.

## Scope

- Tokenization: `src/lib/search/index.ts` (`tokenizeSearchText`, `normalizeSearchText`)
- Activity search: `src/lib/search/activitySearch.ts` (`searchActivities`, `itemMatchesSearch`, `parseSearchQuery`)
- UI integration: `src/features/activity/ActivityPage.tsx`

## Architecture

The Activity page applies filters in this order:

```
data.activity (all ActivityItem[] from makeActivities)
  → 1. YEAR filter (selected year or "All")
  → 2. TYPE filter (left sidebar rail selection, e.g. "Posts", "Comments")
  → 3. PERIOD filter (month/day from TemporalMosaic)
  → 4. SEARCH filter (free-form query, submitted on Enter or button click)
  → 5. PAGINATION (client-side slice, 100 per page)
```

Search is a **local-only operation** — the query is held in component state (`useState`), not in the URL. Page refresh resets the search bar.

## Search Behavior

### Query parsing (`parseSearchQuery`)

| Input                      | Result                                                      |
| -------------------------- | ----------------------------------------------------------- |
| `machine learning`         | Tokens: `['machine', 'learning']` (AND logic)               |
| `"machine learning"`       | Phrase: `['machine learning']` (normalized substring match) |
| `"deep learning" pipeline` | Phrase: `['deep learning']` + Token: `['pipeline']`         |
| `"" hello`                 | Empty quotes ignored, Token: `['hello']`                    |

### Matching (`itemMatchesSearch`)

- **ALL** quoted phrases must be found as substrings (case-insensitive, diacritic-stripped)
- **ALL** keyword tokens must be found in the item's tokenized search text
- Returns `true` for empty queries (no phrases, no tokens)

### Searchable fields (`activitySearchText`)

The search looks at these `ActivityItem` fields (joined with spaces):

- `text` — the primary content (post body, comment text, message body, etc.)
- `targetName` — person/company name the activity is about
- `headline` — job title or role description

**Links/URLs are never searched.** The `href` and `mediaUrl` fields are excluded.

### Non-searchable activity kinds

These kinds have no user-authored text and are **always excluded** from search results:

| Kind         | Reason                                                |
| ------------ | ----------------------------------------------------- |
| `reaction`   | Only reaction-type metadata, no user-authored content |
| `repost`     | Instant reposts have no description, only URLs        |
| `saved-item` | Only bookmark links, no description                   |

`rich-media` is excluded when its text is `"Media"` (the fallback when no description exists). When `Rich_Media.csv` has a `Media Description`, the actual description is searchable.

### Manual submit

The search input uses a daisyUI `join` component with an attached search button.
The query is only submitted when the user presses **Enter** or clicks the **Search** button.
A **Clear** (×) button appears in the join when a search is active, resetting both the input and the filter.

Two pieces of state control this:

- `rawQuery` — the text in the input (updated on every keystroke, no filtering cost)
- `query` — the submitted search term (only set by `submitSearch` / `clearSearch`)

This avoids any per-keystroke re-filtering overhead.

## Tokenization rules

Shared with the IndexedDB search layer (`src/lib/search/index.ts`):

- Unicode NFKD normalization + diacritic stripping (`José` → `jose`)
- Lowercased
- Split on non-letter/non-number characters
- Tokens ≥ 2 characters, ≤ 64 characters
- Deduplicated

## Non-goals

- Search is **not** persisted in the URL (not shareable)
- Search is **not** pushed to IndexedDB — it filters the in-memory `ActivityItem[]`
- The search box does **not** appear on other pages (only `/activity`)
