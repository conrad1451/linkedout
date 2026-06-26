import { useEffect, useState } from 'react';
import {
  queryDataset,
  countDataset,
  type DateRange,
  type DatasetRow,
  type QuerySort,
} from '../lib/store';

export interface UseDatasetState {
  rows: DatasetRow[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useDataset(
  importId: string | null,
  datasetId: string | null,
  options: {
    offset?: number;
    limit?: number;
    search?: string;
    dateRange?: DateRange;
    dateField?: string;
    sort?: QuerySort;
  } = {},
): UseDatasetState {
  const { offset = 0, limit = 50, search = '', dateRange, dateField, sort } = options;
  const from = dateRange?.from;
  const to = dateRange?.to;
  const [state, setState] = useState<UseDatasetState>({
    rows: [],
    total: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!importId || !datasetId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when inputs clear
      setState({ rows: [], total: 0, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const queryOptions = {
          offset,
          limit,
          search,
          dateRange: from === undefined && to === undefined ? undefined : { from, to },
          dateField,
          sort,
        };
        const [rows, total] = await Promise.all([
          queryDataset(importId, datasetId, queryOptions),
          countDataset(importId, datasetId, {
            search,
            dateRange: queryOptions.dateRange,
            dateField,
          }),
        ]);
        if (!cancelled) setState({ rows, total, loading: false, error: null });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[useDataset] query failed', e);
        if (!cancelled)
          setState({
            rows: [],
            total: 0,
            loading: false,
            error: e instanceof Error ? e.message : String(e),
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [importId, datasetId, offset, limit, search, from, to, dateField, sort]);

  return state;
}
