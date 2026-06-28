import { FileSpreadsheet, Folder, FolderTree, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useActiveImport } from '../../app/useImports';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { OpenOnLinkedInLink } from '../../components/OpenOnLinkedInLink';
import { Pagination } from '../../components/Pagination';
import { useDataset } from '../../hooks/useDataset';
import { getSchemaById } from '../../lib/schema';
import type { DatasetMeta } from '../../lib/store';
import { buildFileTree, type FileTreeNode } from './buildFileTree';

const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const RAW_TREE_STATE_KEY_PREFIX = 'linkedout:raw-tree:';

export function RawBrowserPage() {
  const active = useActiveImport();
  const navigate = useNavigate();
  const { datasetId: legacyDatasetId } = useParams<{ datasetId?: string }>();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');

  const datasets = useMemo(() => active?.datasets ?? [], [active?.datasets]);
  const tree = useMemo(() => buildFileTree(datasets), [datasets]);
  const fallbackDatasetId = firstDatasetId(tree) ?? datasets[0]?.datasetId ?? null;
  const requestedDatasetId = searchParams.get('dataset') ?? legacyDatasetId ?? fallbackDatasetId;
  const selectedDataset =
    datasets.find((dataset) => dataset.datasetId === requestedDatasetId) ??
    datasets.find((dataset) => dataset.datasetId === fallbackDatasetId) ??
    null;
  const page = parsePage(searchParams.get('page'));
  const pageSize = parsePageSize(searchParams.get('pageSize'));
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTree = useMemo(() => filterTree(tree, normalizedQuery), [tree, normalizedQuery]);
  const matchingFileCount = useMemo(() => countDatasets(filteredTree), [filteredTree]);

  // Derive stored open-folders from localStorage — synchronous read, no effect needed
  const storedOpenFolders = useMemo(() => readOpenFolders(active?.id ?? null), [active?.id]);

  // Auto-expand ancestor folders for the selected dataset
  const autoExpandPaths = useMemo(() => {
    if (!selectedDataset) return new Set<string>();
    const paths = folderPathsForFilename(selectedDataset.filename);
    return new Set(paths);
  }, [selectedDataset]);

  // Manual folder toggles by the user (stored as explicit overrides)
  const [manualToggles, setManualToggles] = useState<Record<string, boolean>>({});

  // Reset manual toggles when the import changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting derived state when import identity changes
    setManualToggles({});
  }, [active?.id]);

  // Merge all sources into the effective open-folders map
  const openFolders = useMemo(() => {
    const result: Record<string, boolean> = { ...storedOpenFolders };
    for (const path of autoExpandPaths) {
      result[path] = true;
    }
    for (const [path, value] of Object.entries(manualToggles)) {
      result[path] = value;
    }
    return result;
  }, [storedOpenFolders, autoExpandPaths, manualToggles]);

  // Persist effective open-folders back to localStorage (write-only, no setState)
  useEffect(() => {
    writeOpenFolders(active?.id ?? null, openFolders);
  }, [active?.id, openFolders]);

  if (!active) {
    return (
      <EmptyState
        title="No active import"
        description="Import a LinkedIn export ZIP before browsing raw datasets."
        action={
          <Link to="/imports" className="btn btn-primary">
            Import data
          </Link>
        }
      />
    );
  }

  if (active.datasets.length === 0) {
    return (
      <EmptyState
        title="No CSV files available"
        description="This import does not contain any CSV files that can be browsed in the raw view."
        icon={<FileSpreadsheet className="h-5 w-5" />}
      />
    );
  }

  const updateView = (updates: { datasetId?: string; page?: number; pageSize?: number }) => {
    const nextDatasetId = updates.datasetId ?? selectedDataset?.datasetId ?? fallbackDatasetId;
    const nextPage = updates.page ?? page;
    const nextPageSize = updates.pageSize ?? pageSize;
    const nextSearchParams = new URLSearchParams(searchParams);

    if (nextDatasetId) nextSearchParams.set('dataset', nextDatasetId);
    else nextSearchParams.delete('dataset');
    nextSearchParams.set('page', String(Math.max(0, nextPage)));
    nextSearchParams.set('pageSize', String(nextPageSize));

    void navigate({ pathname: '/raw', search: `?${nextSearchParams.toString()}` });
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Raw Data</h1>
          <p className="text-sm opacity-70">
            {active.label} · {active.datasets.length.toLocaleString()} CSV files ·{' '}
            {active.totalRows.toLocaleString()} rows
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-box border border-base-300 bg-base-100 p-3 md:sticky md:top-20 md:self-start">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-base-content/70" />
                <h2 className="font-semibold">Files</h2>
              </div>
              <span className="badge badge-outline badge-sm">{active.datasets.length}</span>
            </div>
            <label className="input input-bordered input-sm flex w-full items-center gap-2 bg-base-200">
              <Search className="h-4 w-4 opacity-60" />
              <input
                type="search"
                className="grow"
                aria-label="Search raw files"
                placeholder="Search files"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {normalizedQuery && (
              <p className="text-xs opacity-60">
                {matchingFileCount.toLocaleString()} matching file
                {matchingFileCount === 1 ? '' : 's'}
              </p>
            )}
          </div>
          {filteredTree.length > 0 ? (
            <ul className="menu menu-sm mt-3 w-full rounded-box bg-base-100 p-0">
              {filteredTree.map((node) => (
                <RawTreeNode
                  key={node.path}
                  node={node}
                  query={normalizedQuery}
                  openFolders={openFolders}
                  selectedDatasetId={selectedDataset?.datasetId ?? null}
                  onSelect={(datasetId) => updateView({ datasetId, page: 0 })}
                  onToggleFolder={(path) =>
                    setManualToggles((current) => ({
                      ...current,
                      [path]: !(openFolders[path] ?? true),
                    }))
                  }
                />
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-box border border-dashed border-base-300 bg-base-200/60 px-3 py-5 text-center text-sm opacity-70">
              No files match your search.
            </div>
          )}
        </aside>

        <section className="min-w-0">
          {selectedDataset ? (
            <RawDatasetPanel
              importId={active.id}
              dataset={selectedDataset}
              page={page}
              pageSize={pageSize}
              onPageChange={(nextPage) => updateView({ page: nextPage })}
              onPageSizeChange={(nextPageSize) => updateView({ pageSize: nextPageSize, page: 0 })}
            />
          ) : (
            <EmptyState
              title="Select a file"
              description="Choose a CSV file from the sidebar to inspect its raw rows."
              icon={<FileSpreadsheet className="h-5 w-5" />}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function RawTreeNode({
  node,
  query,
  openFolders,
  selectedDatasetId,
  onSelect,
  onToggleFolder,
}: {
  node: FileTreeNode;
  query: string;
  openFolders: Record<string, boolean>;
  selectedDatasetId: string | null;
  onSelect: (datasetId: string) => void;
  onToggleFolder: (path: string) => void;
}) {
  if (node.isFolder) {
    const isOpen = query ? true : (openFolders[node.path] ?? true);

    return (
      <li>
        <details open={isOpen}>
          <summary
            onClick={(event) => {
              event.preventDefault();
              if (!query) onToggleFolder(node.path);
            }}
          >
            <span className="truncate">
              <Folder className="mr-1.5 inline-block h-3.5 w-3.5 text-base-content/60" />
              {node.name}/
            </span>
            <span className="badge badge-ghost badge-xs">{node.datasets.length}</span>
          </summary>
          <ul>
            {node.children.map((child) => (
              <RawTreeNode
                key={child.path}
                node={child}
                query={query}
                openFolders={openFolders}
                selectedDatasetId={selectedDatasetId}
                onSelect={onSelect}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </ul>
        </details>
      </li>
    );
  }

  const dataset = node.datasets[0];
  if (!dataset) return null;

  return (
    <li>
      <button
        type="button"
        className={dataset.datasetId === selectedDatasetId ? 'menu-active' : ''}
        onClick={() => onSelect(dataset.datasetId)}
      >
        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 shrink-0 text-base-content/60" />
        <span className="truncate">{node.name}</span>
        <span className="badge badge-ghost badge-xs">{dataset.rowCount.toLocaleString()}</span>
      </button>
    </li>
  );
}

function RawDatasetPanel({
  importId,
  dataset,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  importId: string;
  dataset: DatasetMeta;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const schema = getSchemaById(dataset.schemaId);
  const { rows, total, loading, error } = useDataset(importId, dataset.datasetId, {
    offset: page * pageSize,
    limit: pageSize,
  });

  if (loading) return <div className="loading loading-spinner" aria-label="Loading" />;
  if (error)
    return (
      <div role="alert" className="alert alert-error">
        <span>{error}</span>
      </div>
    );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-box border border-base-300 bg-base-100 p-4">
        <div>
          <h2 className="text-xl font-semibold">{dataset.title}</h2>
          <p className="text-sm opacity-70">
            {dataset.filename} · {dataset.rowCount.toLocaleString()} rows
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Items per page"
            className="select select-bordered select-sm min-w-28"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} items
              </option>
            ))}
          </select>
          {schema?.linkedInHref && (
            <OpenOnLinkedInLink
              href={schema.linkedInHref}
              format="long"
              size="sm"
              label={`Open ${dataset.title} on LinkedIn`}
            />
          )}
        </div>
      </header>

      <div className="space-y-3">
        <DataTable rows={rows} linkField={schema?.linkField} />
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
      </div>
    </div>
  );
}

function parsePage(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function parsePageSize(value: string | null): number {
  if (!value) return DEFAULT_PAGE_SIZE;
  const parsed = Number(value);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])
    ? parsed
    : DEFAULT_PAGE_SIZE;
}

function firstDatasetId(nodes: FileTreeNode[]): string | null {
  for (const node of nodes) {
    if (node.isFolder) {
      const nestedDatasetId = firstDatasetId(node.children);
      if (nestedDatasetId) return nestedDatasetId;
      continue;
    }
    const datasetId = node.datasets[0]?.datasetId;
    if (datasetId) return datasetId;
  }

  return null;
}

function filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  if (!query) return nodes;

  return nodes.flatMap((node) => {
    if (!node.isFolder) {
      return fileMatchesQuery(node, query) ? [node] : [];
    }

    if (folderMatchesQuery(node, query)) return [node];

    const children = filterTree(node.children, query);
    if (children.length === 0) return [];

    return [
      {
        ...node,
        datasets: children.flatMap((child) => child.datasets),
        children,
      },
    ];
  });
}

function fileMatchesQuery(node: FileTreeNode, query: string): boolean {
  const dataset = node.datasets[0];
  if (!dataset) return false;

  return [node.name, dataset.title, dataset.filename, dataset.datasetId].some((value) =>
    value.toLowerCase().includes(query),
  );
}

function folderMatchesQuery(node: FileTreeNode, query: string): boolean {
  return node.name.toLowerCase().includes(query) || node.path.toLowerCase().includes(query);
}

function countDatasets(nodes: FileTreeNode[]): number {
  return nodes.reduce((sum, node) => {
    if (node.isFolder) return sum + countDatasets(node.children);
    return sum + (node.datasets[0] ? 1 : 0);
  }, 0);
}

function folderPathsForFilename(filename: string): string[] {
  const parts = filename.split('/').filter(Boolean);
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
}

function readOpenFolders(importId: string | null): Record<string, boolean> {
  if (!importId || typeof localStorage === 'undefined') return {};

  try {
    const stored = localStorage.getItem(`${RAW_TREE_STATE_KEY_PREFIX}${importId}`);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return isRecordOfBooleans(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeOpenFolders(importId: string | null, openFolders: Record<string, boolean>) {
  if (!importId || typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(`${RAW_TREE_STATE_KEY_PREFIX}${importId}`, JSON.stringify(openFolders));
  } catch {
    // ignore storage failures
  }
}

function isRecordOfBooleans(value: unknown): value is Record<string, boolean> {
  if (!value || typeof value !== 'object') return false;

  return Object.values(value).every((entry) => typeof entry === 'boolean');
}
