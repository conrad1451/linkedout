import React from 'react';
import { formatTemporal } from '../lib/datetime';
import { RelativeTimeText } from './RelativeTimeText';
import { ExternalLinkText } from './ExternalLinkText';
import type { NormalizedTemporal } from '../lib/datetime';

export function RowBase({
  left,
  title,
  titleHref,
  primaryLine,
  secondaryLine,
  afterTitle,
  timePrefix,
  dateTemporal,
  date,
}: {
  left?: React.ReactNode;
  title?: React.ReactNode | string;
  titleHref?: string;
  primaryLine?: React.ReactNode | string;
  secondaryLine?: React.ReactNode | string;
  afterTitle?: React.ReactNode;
  timePrefix?: string;
  dateTemporal?: NormalizedTemporal | undefined;
  date?: string | undefined;
}) {
  const formatted = formatTemporal(dateTemporal, date ?? '');

  return (
    <article className="flex items-start gap-4 px-4 py-4 sm:px-5 sm:py-5">
      {left}
      <div className="min-w-0 flex-1">
        <div className="min-w-0 space-y-1">
          {typeof title === 'string' ? (
            <h3 className="truncate text-lg font-bold">
              {titleHref ? (
                <ExternalLinkText href={titleHref} iconClassName="h-4 w-4">
                  {title}
                </ExternalLinkText>
              ) : (
                title
              )}
            </h3>
          ) : (
            (title ?? null)
          )}

          {afterTitle}

          {primaryLine && (
            <p className="truncate text-sm leading-5 text-base-content/80">{primaryLine}</p>
          )}
          {secondaryLine && (
            <p className="truncate text-sm leading-5 text-base-content/65">{secondaryLine}</p>
          )}

          {timePrefix && (dateTemporal?.epochMs !== undefined || date) && (
            <RelativeTimeText
              value={dateTemporal?.epochMs ?? date ?? ''}
              dateTime={dateTemporal?.raw}
              title={formatted}
              className="block text-xs text-base-content/50"
              prefix={timePrefix}
            />
          )}
        </div>
      </div>
    </article>
  );
}

export default RowBase;
