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
        <LinkedInName
          name={name}
          href={href ?? ''}
          showSearch={showSearch}
          searchCategory={searchCategory}
        />
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
