import { CalendarDays } from 'lucide-react';
import type { NormalizedTemporal } from '../lib/datetime';
import RowBase from './RowBase';

export function EventRow({
  eventName,
  statusSummary,
  timePrefix,
  dateTemporal,
  date,
}: {
  eventName: string;
  statusSummary?: string;
  timePrefix?: string;
  dateTemporal?: NormalizedTemporal;
  date?: string;
}) {
  return (
    <RowBase
      left={
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-base-300 font-bold text-base-content">
          <CalendarDays className="h-5 w-5" />
        </div>
      }
      title={eventName}
      primaryLine={statusSummary}
      timePrefix={timePrefix}
      dateTemporal={dateTemporal}
      date={date}
    />
  );
}

export default EventRow;
