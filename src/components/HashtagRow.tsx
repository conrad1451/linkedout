import { Hash } from 'lucide-react';
import { LinkedInName } from './LinkedInName';
import { linkedInHashtagSearchUrl } from '../lib/linkedin/search';
import type { NormalizedTemporal } from '../lib/datetime';
import RowBase from './RowBase';

export function HashtagRow({
  tag,
  href,
  dateTemporal,
  date,
}: {
  tag: string;
  href?: string;
  dateTemporal?: NormalizedTemporal | undefined;
  date?: string | undefined;
}) {
  const label = tag.startsWith('#') ? tag : `#${tag}`;
  const link = href ?? (tag ? linkedInHashtagSearchUrl(label) : undefined);

  return (
    <RowBase
      left={
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-base-300 font-bold text-base-content">
          <Hash className="h-5 w-5" />
        </div>
      }
      title={<LinkedInName name={label} showSearch={true} searchUrl={link} />}
      timePrefix="Followed"
      dateTemporal={dateTemporal}
      date={date}
    />
  );
}

export default HashtagRow;
