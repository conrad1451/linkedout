import { InitialsAvatar } from './InitialsAvatar';
import { LinkedInName } from './LinkedInName';
import type { NormalizedTemporal } from '../lib/datetime';
import RowBase from './RowBase';

export function PersonRow({
  name,
  href,
  primaryLine,
  secondaryLine,
  timePrefix,
  dateTemporal,
  date,
  showSearch,
  searchCategory,
  avatarClassName,
  badge,
}: {
  name: string;
  href?: string;
  primaryLine?: string;
  secondaryLine?: string;
  timePrefix?: string;
  dateTemporal?: NormalizedTemporal;
  date?: string;
  showSearch?: boolean;
  searchCategory?: 'people' | 'companies';
  avatarClassName?: string;
  badge?: React.ReactNode;
}) {
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
          <LinkedInName
            name={name}
            href={href ?? ''}
            showSearch={showSearch}
            searchCategory={searchCategory}
          />
          {badge}
        </span>
      }
      primaryLine={primaryLine}
      secondaryLine={secondaryLine}
      timePrefix={timePrefix}
      dateTemporal={dateTemporal}
      date={date}
    />
  );
}

export default PersonRow;
