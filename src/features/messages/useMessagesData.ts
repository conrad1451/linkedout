import { useEffect, useState } from 'react';
import { queryDataset, type DatasetMeta, type DatasetRow, type ImportMeta } from '../../lib/store';
import {
  buildMessageConnectionIndex,
  buildMessageConversations,
  type MessageConversation,
  type MessageSourceRow,
} from './model';

export interface MessagesData {
  conversations: MessageConversation[];
  messageDatasets: DatasetMeta[];
  primaryDatasetId: string | null;
  ownerName: string;
  totalRows: number;
}

export interface UseMessagesDataState {
  data: MessagesData | null;
  loading: boolean;
  error: string | null;
}

export function useMessagesData(importMeta: ImportMeta | null): UseMessagesDataState {
  const [state, setState] = useState<UseMessagesDataState>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!importMeta) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when active import clears
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    (async () => {
      try {
        const messageDatasets = sortedMessageDatasets(importMeta.datasets);
        const primaryDatasetId =
          messageDatasets.find((dataset) => dataset.schemaId === 'messages')?.datasetId ??
          messageDatasets[0]?.datasetId ??
          null;
        const profileDataset = importMeta.datasets.find(
          (dataset) => dataset.schemaId === 'profile',
        );
        const connectionsDataset = importMeta.datasets.find(
          (dataset) => dataset.schemaId === 'connections',
        );

        const [sourceRows, profileRows, connectionRows] = await Promise.all([
          loadMessageSources(importMeta.id, messageDatasets),
          loadRows(importMeta.id, profileDataset, 1),
          loadRows(importMeta.id, connectionsDataset, connectionsDataset?.rowCount ?? 0),
        ]);

        const ownerName = ownerNameFromProfile(profileRows[0]);
        const connectionIndex = buildMessageConnectionIndex(connectionRows);
        const conversations = buildMessageConversations(sourceRows, { ownerName, connectionIndex });
        const data: MessagesData = {
          conversations,
          messageDatasets,
          primaryDatasetId,
          ownerName,
          totalRows: sourceRows.length,
        };

        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[useMessagesData] load failed', error);
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [importMeta]);

  return state;
}

function sortedMessageDatasets(datasets: DatasetMeta[]): DatasetMeta[] {
  const messageDatasets = datasets
    .filter((dataset) => dataset.category === 'messages' && dataset.rowCount > 0)
    .sort(
      (left, right) =>
        messageDatasetRank(left) - messageDatasetRank(right) ||
        left.title.localeCompare(right.title),
    );
  const primaryMessages = messageDatasets.filter((dataset) => dataset.schemaId === 'messages');
  return primaryMessages.length > 0 ? primaryMessages : messageDatasets;
}

function messageDatasetRank(dataset: DatasetMeta): number {
  if (dataset.schemaId === 'messages') return 0;
  if (dataset.filename.toLowerCase().endsWith('messages.csv')) return 1;
  return 2;
}

async function loadMessageSources(
  importId: string,
  datasets: DatasetMeta[],
): Promise<MessageSourceRow[]> {
  const sources = await Promise.all(
    datasets.map(async (dataset) => {
      const rows = await loadRows(importId, dataset, dataset.rowCount);
      return rows.map(
        (row): MessageSourceRow => ({
          row,
          datasetId: dataset.datasetId,
          datasetTitle: dataset.title,
        }),
      );
    }),
  );
  return sources.flat();
}

async function loadRows(
  importId: string,
  dataset: DatasetMeta | undefined,
  limit: number,
): Promise<DatasetRow[]> {
  if (!dataset || limit <= 0) return [];
  return queryDataset(importId, dataset.datasetId, {
    limit,
    sort: dataset.dateField ? 'date-asc' : 'row',
  });
}

function ownerNameFromProfile(profile: DatasetRow | undefined): string {
  if (!profile) return '';
  return [cell(profile, 'First Name'), cell(profile, 'Last Name')].filter(Boolean).join(' ');
}

function cell(row: DatasetRow, key: string): string {
  const value = row[key];
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}
