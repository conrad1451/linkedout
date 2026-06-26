import { ExternalLink } from 'lucide-react';

type OpenOnLinkedInFormat = 'short' | 'long';
type OpenOnLinkedInSize = 'xs' | 'sm' | 'md';

const SIZE_CLASS: Record<OpenOnLinkedInSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: 'btn-md',
};

export function OpenOnLinkedInLink({
  href,
  format = 'long',
  size = 'sm',
  label = 'Open on LinkedIn',
  className = '',
}: {
  href?: string;
  format?: OpenOnLinkedInFormat;
  size?: OpenOnLinkedInSize;
  label?: string;
  className?: string;
}) {
  if (!href) return null;
  const classes =
    format === 'short'
      ? `btn btn-outline btn-info btn-square ${SIZE_CLASS[size]} ${className}`.trim()
      : `btn btn-outline btn-info ${SIZE_CLASS[size]} ${className}`.trim();

  const iconClass = size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  if (format === 'short') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={classes}
        aria-label={label}
        title={label}
      >
        <ExternalLink className={`${iconClass} text-current`} aria-hidden="true" />
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={classes} title={label}>
      <span>Open on LinkedIn</span>
      <ExternalLink className={`${iconClass} text-current`} aria-hidden="true" />
    </a>
  );
}
