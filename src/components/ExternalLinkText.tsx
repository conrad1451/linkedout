import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

export function ExternalLinkText({
  children,
  href,
  className = '',
  ariaLabel,
  iconClassName = 'h-3.5 w-3.5',
}: {
  children: ReactNode;
  href?: string;
  className?: string;
  ariaLabel?: string;
  iconClassName?: string;
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`inline-flex max-w-full items-center gap-1 underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`.trim()}
      aria-label={ariaLabel}
      title={href}
    >
      <span className="truncate">{children}</span>
      <ExternalLink className={`${iconClassName} shrink-0`} aria-hidden="true" />
    </a>
  );
}
