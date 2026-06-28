# Activity Feature Notes

This file documents how Activity items are rendered and how the Activity page works so future agents can maintain consistency.

## Scope

- Page entrypoint: `src/features/activity/ActivityPage.tsx`
- Card rendering: `src/features/activity/ActivityCard.tsx`
- Data model: `src/features/profile/model.ts` (`ActivityItem`, `ActivityKind`, `makeActivities`)
- Data loading: `src/features/profile/useProfileData.ts`

## Architecture

1. `useProfileData()` loads all datasets from IndexedDB and passes them to `makeActivities()`.
2. `makeActivities()` transforms each dataset's rows into a unified `ActivityItem[]`, then sorts by date descending.
3. `ActivityPage` groups items by filter, handles temporal controls (year/mosaic), and delegates rendering to `ActivityCard`.
4. `ActivityCard` renders each item with a type-specific layout.

## Visual Design Patterns

Every activity card follows these patterns. Do not deviate without updating this document.

### Card container

```tsx
<article className="rounded-box border border-base-300 bg-base-100 shadow-sm overflow-hidden">
  <div className="flex gap-3 p-4">{/* icon/avatar + content */}</div>
</article>
```

### Icon / Avatar

- **Generic entities** (search, ad, receipt, learning, security, etc.): Round container with lucide icon:
  ```tsx
  <div className="inline-flex shrink-0 items-center justify-center rounded-full bg-base-300 text-base-content h-12 w-12">
    <IconName className="h-5 w-5 opacity-70" />
  </div>
  ```
- **Person entities** (recommendations, imported contacts, connections, member follows): Use `InitialsAvatar`:
  ```tsx
  <InitialsAvatar name={name} size="md" />
  ```

### Title

```tsx
<h3 className="truncate font-semibold">
  {/* If a link exists: */}
  <a href={url} target="_blank" rel="noreferrer noopener" className="hover:underline">
    {title}
  </a>
  {/* If no link, just {title} */}
</h3>
```

The title should be the most meaningful, specific piece of information — never the user's own name.

### Date

Always use `RelativeTimeText` with the `parseActivityDate` helper:

```tsx
<p className="text-xs opacity-70">
  <RelativeTimeText value={parseActivityDate(activity)} />
</p>
```

### Badges

Supplementary metadata goes in ghost badges next to the title:

```tsx
<span className="badge badge-ghost badge-xs">{value}</span>
```

- **Direction badges**: "Received" uses `badge-success` (filled green), "Sent"/"Given"/"Imported" uses `badge-ghost`
- **Status badges**: `badge-success` for "primary" (filled), `badge-ghost badge-success` for "confirmed" (outline)

### Body text

Additional content goes below the date line:

```tsx
<p className="mt-1 whitespace-pre-line text-xs">{body}</p>
```

No special styling — plain `text-xs`, consistent with receipt amount lines.

### Key/Value detail grids

For entities with structured metadata (verifications, imported contacts):

```tsx
<dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
  {entries.flatMap(([key, value]) => [
    <dt key={`dt-${key}`} className="opacity-60">
      {key}
    </dt>,
    <dd key={`dd-${key}`} className="truncate">
      {value}
    </dd>,
  ])}
</dl>
```

Use `flatMap` (not `map` with `<>` fragments) to produce adjacent `<dt>`/`<dd>` pairs with unique keys.

### HTML content (e.g. learning descriptions)

```tsx
<div
  className="mt-2 text-xs space-y-2"
  dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlString) }}
/>
```

`sanitizeHtml` allows: `i, em, b, strong, u, p, h1-h6, br, hr, ul, ol, li, a, span, div, blockquote, code, pre`. All other tags and event handlers are stripped.

## Card Type Reference

### Posts (fallback rendering)

Uses the generic fallback card with initials avatar, user name as title, eyebrow + absolute date line, body text, media link, and "Open on LinkedIn" link. Posts hit the fallback when no specific card type matches.

### Comments

- Icon: `MessageSquare`
- Title: "Comment" (linked to post URL)
- Body: full comment text

### Reposts

- Icon: `Repeat2`
- Title: "Repost" (linked to post URL)

### Reactions / Votes

Uses a specialized compact layout with `ReactionIcon` and reaction type badge. Votes show the selected option text.

### Search

- Icon: `Search`
- Title: search term (linked to `https://www.linkedin.com/search/results/all/?keywords=...`)
- Helper: `searchTerm()` strips `Searched for ` prefix and quote wrappers

### Ads Clicked

- Icon: `Megaphone`
- Title: ad ID (linked to `https://www.linkedin.com/ad-library/detail/<id>`)
- Helper: `adIdentifier()` strips `Clicked ad ` prefix

### Receipts

- Icon: `CreditCard`
- Title: description (linked to `https://www.linkedin.com/manage/purchases-payments/transactions`)
- Amount line: `S + T = A` format via `formatReceiptAmounts()`, each with `title` tooltips
- Fields: `receiptSubTotal`, `receiptTaxAmount`, `receiptTotalAmount`, `receiptCurrency`

### Email Updates

- Icon: `Mail`
- Title: email address (extracted from text)
- Status badges: "primary" (filled green), "confirmed" (outline green)

### Security Challenges

- Icon: `Shield`
- Title: challenge type
- Badge: country name (ghost)
- Lines: IP Address, User Agent
- Fields: `challengeIp`, `challengeUserAgent`, `targetName` (type), `text` (country)

### Security Logins

- Icon: `Shield`
- Title: login type
- Lines: IP Address, User Agent
- Fields: `loginIp`, `loginUserAgent`, `targetName` (type)

### Security Verifications

- Icon: `Shield`
- Title: verification type
- Detail grid: Organization, Email, Country, State, City, Year of birth, Issuing authority, Document type, Service provider, Expiry date
- N/A and null values filtered out
- Field: `verificationDetails: Record<string, string>`

### Learning

- Icon: `GraduationCap`
- Title: course title (linked to `https://www.linkedin.com/learning/me/my-library/`)
- Description: `learningDescription` rendered as sanitized HTML

### Jobs (Applied & Saved)

- Icon: `BriefcaseBusiness`
- Title: job title (linked to job URL), extracted via `jobTitleFromText()`
- Badge: company name (ghost)
- Subtypes: `job-applied`, `job-saved`

### Saved Items

- Icon: `Bookmark`
- Title: "Saved item" (linked to item URL)

### Endorsements (Given & Received)

- Icon: `Star`
- Title: person's name (linked to profile)
- Badges: skill name (ghost), "Given"/"Received" direction
- Helper: `skillFromEndorsement()` extracts skill from text

### Messages (Sent & Received)

- Icon: `MessageSquare`
- Title: counterpart name (linked to profile)
- Badge: "Sent"/"Received" direction
- Body: message content (stripped of "To X: " or "X: " prefix)
- Helper: `messageContent()` strips prefix

### Hashtags

- Icon: `Hash`
- Title: `#tagname` (linked to LinkedIn hashtag search)

### Events

- Icon: `CalendarDays`
- Title: event name
- Status line below title
- Date with "Started"/"Starts" prefix via `RelativeTimeText`

### Recommendations (Given & Received)

Uses `InitialsAvatar` + person name as title + headline + eyebrow line + quote body. Separate from endorsements — recommendations carry longer text bodies.

- Badges: "Given"/"Received" direction (`badge-xs`), status like "Visible"/"Pending" (`badge-sm badge-ghost`)

### Connections / Member Follows

Delegates to `PersonRow` shared component.

### Company Follows

Delegates to `CompanyRow` shared component.

### Invitations (Sent & Received)

Delegates to `InvitationRow` shared component.

### Imported Contacts

- Avatar: `InitialsAvatar`
- Title: person's name
- Badge: "Imported" (ghost)
- Detail grid: Email, Phone, Title, Location, Country, Region, Company
- N/A and null values filtered out
- Field: `importedContactDetails: Record<string, string>`

### Account Creation (Registration)

Still uses generic fallback card (user name + eyebrow + body text).

## Helper Functions

Located at the bottom of `ActivityCard.tsx`:

| Function                            | Purpose                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `parseActivityDate(activity)`       | Returns epoch ms, timestamp, or raw string for `RelativeTimeText`  |
| `searchTerm(text)`                  | Strips "Searched for " prefix and quote wrappers                   |
| `linkedInSearchUrl(query)`          | Builds LinkedIn search URL with encoded keyword                    |
| `adIdentifier(text)`                | Strips "Clicked ad " prefix                                        |
| `formatReceiptAmounts(activity)`    | Renders `S + T = A` with per-amount tooltips                       |
| `receiptTitle(text)`                | Strips amount suffix from receipt description                      |
| `emailAddress(text)`                | Extracts email from "Updated email address: ..."                   |
| `learningCourseTitle(text)`         | Extracts course title from "Viewed/Completed course: Title"        |
| `jobTitleFromText(text)`            | Extracts job title from "Applied to X at Y" or "Saved job: X at Y" |
| `skillFromEndorsement(text)`        | Extracts skill name from endorsement text                          |
| `messageContent(text, counterpart)` | Strips "To X: " or "X: " prefix from message text                  |
| `sanitizeHtml(raw)`                 | Allows safe HTML tags, strips event handlers and javascript: URLs  |
| `escapeHtml(value)`                 | Escapes `&`, `<`, `>` for non-HTML strings                         |

## ActivityItem Model Extensions

Beyond the base fields, `ActivityItem` has optional fields for specific card types:

- `receiptSubTotal`, `receiptTaxAmount`, `receiptTotalAmount`, `receiptCurrency` — receipts
- `learningDescription` — learning (HTML content)
- `challengeIp`, `challengeUserAgent` — security challenges
- `loginIp`, `loginUserAgent` — security logins
- `verificationDetails: Record<string, string>` — verifications
- `importedContactDetails: Record<string, string>` — imported contacts
