import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatTemporal, parseTemporalValue, type NormalizedTemporal } from '../lib/datetime';
import type { DatasetCellValue, DatasetRow } from '../lib/store';
import { OpenOnLinkedInLink } from './OpenOnLinkedInLink';

export interface DataTableProps {
  rows: DatasetRow[];
  columns?: string[];
  linkField?: string;
  emptyMessage?: string;
  maxVisibleRows?: number;
}

type SortState = { column: string; direction: 'asc' | 'desc' } | null;

const DATE_FIELD_RE =
  /(date|time|created|updated|sent|received|registered|verified|issued|started|finished|followed|connected|login|challenge|transaction|application|watched)/i;

export function DataTable({
  rows,
  columns,
  linkField,
  emptyMessage = 'No rows.',
  maxVisibleRows = 200,
}: DataTableProps) {
  const [sort, setSort] = useState<SortState>(null);
  const cols = useMemo(() => columns ?? inferColumns(rows), [columns, rows]);
  const sortedRows = useMemo(() => sortRows(rows, sort), [rows, sort]);
  const visibleRows = sortedRows.slice(0, maxVisibleRows);

  if (rows.length === 0) {
    return (
      <div className="rounded-box border border-base-300 bg-base-100 p-8 text-center opacity-70">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-box border border-base-300 bg-base-100">
      <div className="overflow-x-auto">
        <table className="table table-zebra table-sm">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-semibold"
                    onClick={() => setSort(nextSort(sort, c))}
                  >
                    {c}
                    <SortIcon sort={sort} column={c} />
                  </button>
                </th>
              ))}
              {linkField && <th aria-label="link" />}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.__row}>
                {cols.map((c) => {
                  const text = cellText(row[c], row, c);
                  return (
                    <td key={c} className="max-w-md truncate" title={text}>
                      {text}
                    </td>
                  );
                })}
                {linkField && (
                  <td>
                    {linkHref(row[linkField]) ? (
                      <OpenOnLinkedInLink
                        href={linkHref(row[linkField])}
                        format="short"
                        size="xs"
                        label="Open LinkedIn link"
                      />
                    ) : null}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedRows.length > visibleRows.length && (
        <div className="border-t border-base-300 p-3 text-sm opacity-70">
          Showing {visibleRows.length.toLocaleString()} of {sortedRows.length.toLocaleString()}{' '}
          matching rows.
        </div>
      )}
    </div>
  );
}

function SortIcon({ sort, column }: { sort: SortState; column: string }) {
  if (sort?.column !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  if (sort.direction === 'asc') return <ArrowUp className="h-3.5 w-3.5 text-primary" />;
  return <ArrowDown className="h-3.5 w-3.5 text-primary" />;
}

function nextSort(current: SortState, column: string): SortState {
  if (current?.column !== column) return { column, direction: 'asc' };
  if (current.direction === 'asc') return { column, direction: 'desc' };
  return null;
}

function sortRows(rows: DatasetRow[], sort: SortState): DatasetRow[] {
  if (!sort) return rows;
  const direction = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => compareCells(a, b, sort.column) * direction);
}

function cellText(value: DatasetCellValue, row?: DatasetRow, column?: string): string {
  const temporal = row && column ? cellTemporal(row, column) : undefined;
  if (temporal) return formatTemporal(temporal, temporal.raw);
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function compareCells(left: DatasetRow, right: DatasetRow, column: string): number {
  const leftTemporal = comparableTemporalValue(cellTemporal(left, column));
  const rightTemporal = comparableTemporalValue(cellTemporal(right, column));
  if (leftTemporal !== undefined && rightTemporal !== undefined)
    return leftTemporal - rightTemporal;
  return cellText(left[column], left, column).localeCompare(
    cellText(right[column], right, column),
    undefined,
    {
      numeric: true,
    },
  );
}

function cellTemporal(row: DatasetRow, column: string): NormalizedTemporal | undefined {
  const temporal = row.__dates?.[column];
  if (temporal) return temporal;
  const value = row[column];
  return DATE_FIELD_RE.test(column) && typeof value === 'string'
    ? parseTemporalValue(value)
    : undefined;
}

function comparableTemporalValue(temporal: NormalizedTemporal | undefined): number | undefined {
  if (!temporal) return undefined;
  if (temporal.epochMs !== undefined) return temporal.epochMs;
  return temporal.timeMs;
}

function linkHref(value: DatasetCellValue): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function inferColumns(rows: DatasetRow[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!key.startsWith('__')) seen.add(key);
    }
  }
  return [...seen];
}
