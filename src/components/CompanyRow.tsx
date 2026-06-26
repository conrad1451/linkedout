import { Building2 } from 'lucide-react';
import { LinkedInName } from './LinkedInName';
import type { NormalizedTemporal } from '../lib/datetime';
import RowBase from './RowBase';

export function CompanyRow({
  name,
  href,
  timePrefix,
  dateTemporal,
  date,
  showSearch,
}: {
  name: string;
  href?: string;
  timePrefix?: string;
  dateTemporal?: NormalizedTemporal;
  date?: string;
  showSearch?: boolean;
}) {
  return (
    <RowBase
      left={
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-base-300 font-bold text-base-content">
          <Building2 className="h-5 w-5" />
        </div>
      }
      title={
        <LinkedInName
          name={name}
          href={href ?? ''}
          showSearch={showSearch}
          searchCategory="companies"
        />
      }
      timePrefix={timePrefix}
      dateTemporal={dateTemporal}
      date={date}
    />
  );
}

export default CompanyRow;
