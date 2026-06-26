import { Grape } from 'lucide-react';
import { InitialsAvatar } from './InitialsAvatar';
import { LinkedInName } from './LinkedInName';
import { RelativeTimeText } from './RelativeTimeText';

type EndorsementRowVariant = 'profile' | 'network';

interface EndorsementRowProps {
  name: string;
  href?: string;
  skillName?: string;
  statusLabel?: string;
  createdAtValue?: Date | number | string;
  createdAtTitle?: string;
  variant?: EndorsementRowVariant;
}

function statusBadgeClass(status: string): string {
  return `badge badge-sm ${status === 'Visible' || status === 'Accepted' ? 'badge-success' : status === 'Pending' ? 'badge-warning' : 'badge-ghost'}`;
}

export function EndorsementRow({
  name,
  href,
  skillName,
  statusLabel,
  createdAtValue,
  createdAtTitle,
  variant = 'profile',
}: EndorsementRowProps) {
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
              <LinkedInName name={displayName} href={href ?? ''} />
              {createdAtValue ? (
                <RelativeTimeText
                  value={createdAtValue}
                  title={createdAtTitle}
                  prefix="Endorsed"
                  className="block text-xs text-base-content/50"
                />
              ) : null}
              {statusLabel ? (
                <span className={statusBadgeClass(statusLabel)}>{statusLabel}</span>
              ) : null}
            </div>
            {skillName ? (
              <p className="mt-3 flex gap-2 text-sm leading-relaxed">
                <Grape className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{skillName}</span>
              </p>
            ) : null}
          </>
        ) : (
          <>
            <h3 className="font-semibold">{displayName}</h3>
            {skillName ? (
              <p className="mt-3 flex gap-2 text-sm leading-relaxed">
                <Grape className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {skillName}
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

export default EndorsementRow;
