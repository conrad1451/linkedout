import { Quote } from 'lucide-react';
import { InitialsAvatar } from './InitialsAvatar';
import { RelativeTimeText } from './RelativeTimeText';

type RecommendationRowVariant = 'profile' | 'network';

interface RecommendationRowProps {
  name: string;
  headline?: string;
  recommendationText?: string;
  statusLabel?: string;
  createdAtValue?: Date | number | string;
  createdAtTitle?: string;
  variant?: RecommendationRowVariant;
}

function statusBadgeClass(status: string): string {
  return `badge badge-sm ${status === 'Visible' ? 'badge-success' : status === 'Pending' ? 'badge-warning' : 'badge-ghost'}`;
}

export function RecommendationRow({
  name,
  headline,
  recommendationText,
  statusLabel,
  createdAtValue,
  createdAtTitle,
  variant = 'profile',
}: RecommendationRowProps) {
  const displayName = name || 'LinkedIn member';
  const content = (
    <>
      <InitialsAvatar
        name={displayName}
        size="md"
        className={
          variant === 'profile'
            ? 'bg-base-300 text-base-content'
            : 'bg-base-300 text-base-content ring-1 ring-base-300'
        }
      />
      <div className={variant === 'profile' ? '' : 'min-w-0 flex-1'}>
        {variant === 'network' ? (
          <>
            <div className="min-w-0 space-y-1">
              <h3 className="truncate text-lg font-bold">{displayName}</h3>
              {statusLabel ? (
                <span className={statusBadgeClass(statusLabel)}>{statusLabel}</span>
              ) : null}
              {headline ? (
                <p className="truncate text-sm leading-5 text-base-content/80">{headline}</p>
              ) : null}
              {createdAtValue ? (
                <RelativeTimeText
                  value={createdAtValue}
                  title={createdAtTitle}
                  prefix="Created"
                  className="block text-xs text-base-content/50"
                />
              ) : null}
            </div>
            {recommendationText ? (
              <p className="mt-3 flex gap-2 text-sm leading-relaxed">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="whitespace-pre-line">{recommendationText}</span>
              </p>
            ) : null}
          </>
        ) : (
          <>
            <h3 className="font-semibold">{displayName}</h3>
            {headline ? <p className="text-sm opacity-70">{headline}</p> : null}
            {recommendationText ? (
              <p className="mt-3 flex gap-2 text-sm leading-relaxed">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {recommendationText}
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );

  if (variant === 'profile') {
    return (
      <div className="rounded-box border border-base-300 p-4">
        <div className="flex gap-3">{content}</div>
      </div>
    );
  }

  return <article className="flex items-start gap-4 px-4 py-4 sm:px-5 sm:py-5">{content}</article>;
}

export default RecommendationRow;
