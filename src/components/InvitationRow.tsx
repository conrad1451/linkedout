import { InitialsAvatar } from './InitialsAvatar';
import { LinkedInName } from './LinkedInName';
import type { NormalizedTemporal } from '../lib/datetime';
import RowBase from './RowBase';

export function InvitationRow({
  name,
  href,
  message,
  dateTemporal,
  date,
  direction,
  avatarClassName,
  badge,
}: {
  name: string;
  href?: string;
  message?: string;
  dateTemporal?: NormalizedTemporal;
  date?: string;
  direction?: 'incoming' | 'outgoing';
  avatarClassName?: string;
  badge?: React.ReactNode;
}) {
  const timePrefix = direction === 'incoming' ? 'Received' : 'Sent';

  return (
    <RowBase
      left={
        <InitialsAvatar
          name={name}
          size="md"
          className={avatarClassName ?? 'bg-base-300 text-base-content ring-1 ring-base-300'}
        />
      }
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          <LinkedInName name={name} href={href ?? ''} />
          {badge}
        </span>
      }
      afterTitle={
        message ? (
          <blockquote className="mt-1 rounded-md border-l-4 border-base-300 bg-base-200/60 p-3 text-sm italic text-base-content/75 whitespace-pre-wrap">
            {message}
          </blockquote>
        ) : undefined
      }
      timePrefix={timePrefix}
      dateTemporal={dateTemporal}
      date={date}
    />
  );
}

export default InvitationRow;
