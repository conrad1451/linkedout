import { ExternalLink, Search } from 'lucide-react';

export function LinkedInName({
  name,
  href,
  linkLabel,
  showSearch,
  searchCategory,
  searchUrl,
  inline,
}: {
  name: string;
  href?: string;
  linkLabel?: string;
  showSearch?: boolean;
  searchCategory?: 'people' | 'companies' | 'schools' | 'all';
  searchUrl?: string;
  inline?: boolean;
}) {
  const category = searchCategory ?? 'people';
  const searchHref =
    searchUrl ??
    `https://www.linkedin.com/search/results/${category}/?keywords=${encodeURIComponent(name)}`;

  // Inline rendering is used when this component is embedded inside another heading
  // (for example, the timeline/education row). Inline mode avoids emitting its own
  // top-level heading and instead returns small inline elements suitable for nesting.
  if (!href) {
    if (inline)
      return (
        <span className="inline-flex items-center gap-2">
          <span className="truncate">{name}</span>
          {showSearch ? (
            <a
              href={searchHref}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-outline btn-info btn-square btn-xs"
              aria-label="Find on LinkedIn"
              title="Find on LinkedIn"
            >
              <Search className="h-3.5 w-3.5 text-current" aria-hidden="true" />
            </a>
          ) : null}
        </span>
      );

    return (
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold">{name}</h3>
        {showSearch ? (
          <a
            href={searchHref}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-outline btn-info btn-square btn-xs"
            aria-label="Find on LinkedIn"
            title="Find on LinkedIn"
          >
            <Search className="h-3.5 w-3.5 text-current" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    );
  }

  if (inline)
    return (
      <span className="inline-flex items-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex max-w-full items-center gap-1 underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={linkLabel ?? `Open ${name}'s LinkedIn profile`}
          title={href}
        >
          <span className="truncate">{name}</span>
          <ExternalLink className="h-4 w-4 shrink-0" />
        </a>
        {showSearch ? (
          <a
            href={searchHref}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-outline btn-info btn-square btn-xs"
            aria-label="Find on LinkedIn"
            title="Find on LinkedIn"
          >
            <Search className="h-3.5 w-3.5 text-current" aria-hidden="true" />
          </a>
        ) : null}
      </span>
    );

  return (
    <div className="flex items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex max-w-full items-center gap-1 text-lg font-bold underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={linkLabel ?? `Open ${name}'s LinkedIn profile`}
        title={href}
      >
        <span className="truncate">{name}</span>
        <ExternalLink className="h-4 w-4 shrink-0" />
      </a>
      {showSearch ? (
        <a
          href={searchHref}
          target="_blank"
          rel="noreferrer noopener"
          className="btn btn-outline btn-info btn-square btn-xs"
          aria-label="Find on LinkedIn"
          title="Find on LinkedIn"
        >
          <Search className="h-3.5 w-3.5 text-current" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

export default LinkedInName;
