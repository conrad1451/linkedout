import { FolderTree } from 'lucide-react';
import { Link } from 'react-router-dom';

type OpenRawTableFormat = 'short' | 'long';
type OpenRawTableSize = 'xs' | 'sm' | 'md';

const SIZE_CLASS: Record<OpenRawTableSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: 'btn-md',
};

export function OpenRawTableLink({
  to,
  href,
  format = 'long',
  size = 'sm',
  label = 'Open raw table',
  className = '',
}: {
  to?: string;
  href?: string;
  format?: OpenRawTableFormat;
  size?: OpenRawTableSize;
  label?: string;
  className?: string;
}) {
  const classes =
    format === 'short'
      ? `btn btn-outline btn-neutral btn-square ${SIZE_CLASS[size]} ${className}`.trim()
      : `btn btn-outline btn-neutral ${SIZE_CLASS[size]} ${className}`.trim();

  const iconClass = size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  if (to) {
    if (format === 'short') {
      return (
        <Link to={to} className={classes} aria-label={label} title={label}>
          <FolderTree className={`${iconClass} text-current`} aria-hidden="true" />
        </Link>
      );
    }

    return (
      <Link to={to} className={classes} title={label}>
        <span>{label}</span>
        <FolderTree className={`${iconClass} text-current`} aria-hidden="true" />
      </Link>
    );
  }

  if (href) {
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
          <FolderTree className={`${iconClass} text-current`} aria-hidden="true" />
        </a>
      );
    }

    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={classes} title={label}>
        <span>{label}</span>
        <FolderTree className={`${iconClass} text-current`} aria-hidden="true" />
      </a>
    );
  }

  // Non-interactive fallback (used when the surrounding element is already a link)
  if (format === 'short') {
    return (
      <span className={classes} aria-label={label} title={label}>
        <FolderTree className={`${iconClass} text-current`} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className={classes} title={label}>
      <span>{label}</span>
      <FolderTree className={`${iconClass} text-current`} aria-hidden="true" />
    </span>
  );
}
