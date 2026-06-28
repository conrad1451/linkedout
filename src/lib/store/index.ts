import { openDB, type IDBPDatabase } from 'idb';
import { parseTemporalValue, type NormalizedTemporal, type TemporalPrecision } from '../datetime';
import { getSchemaById } from '../schema';
import {
  inferLinkedInProfileInfo,
  type LinkedInProfileInfo,
  type LinkedInProfileSourceDataset,
} from '../linkedin/profile';
import { tokenizeSearchText } from '../search';
import { openMetaDb, STORE_IMPORTS, STORE_SETTINGS } from './meta';

// Diagnostics counters for per-row work (used for sampling/summary logs)
let __diagRowCount = 0;
let __diagNormalizeMs = 0;
let __diagTokenMs = 0;

function nowMs(): number {
  // prefer high-resolution timer when available

  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export interface ImportMeta {
  id: string;
  label: string;
  createdAt: number;
  fileCount: number;
  totalRows: number;
  linkedInProfile?: LinkedInProfileInfo;
  datasets: DatasetMeta[];
}

export interface DatasetMeta {
  datasetId: string;
  schemaId: string;
  filename: string;
  title: string;
  category: string;
  rowCount: number;
  dateField?: string;
}

export interface AppSettings {
  activeImportId: string | null;
}

const SETTINGS_KEY = 'app';

const IMPORT_DB_VERSION = 2;
const STORE_ROWS_PREFIX = 'dataset:';
const INDEX_DATE = 'by-date';
const INDEX_SEARCH_TOKEN = 'by-search-token';
const LINKEDIN_PROFILE_SOURCE_SCHEMA_IDS = new Set([
  'profile',
  'invitations',
  'messages',
  'guide-messages',
  'learning-coach-messages',
  'learning-role-play-messages',
]);

export type DatasetCellValue =
  | string
  | number
  | string[]
  | NormalizedTemporal
  | Record<string, NormalizedTemporal>
  | undefined;

export interface DatasetRow extends Record<string, DatasetCellValue> {
  __row: number;
  __date?: number;
  __dateField?: string;
  __datePrecision?: TemporalPrecision;
  __dates?: Record<string, NormalizedTemporal>;
  __searchTokens?: string[];
}

function importDbName(importId: string): string {
  return `linkedout-import-${importId}`;
}

async function openImportDb(importId: string, datasetIds: string[]): Promise<IDBPDatabase> {
  return openDB(importDbName(importId), IMPORT_DB_VERSION, {
    upgrade(db, _oldVersion, _newVersion, tx) {
      for (const datasetId of datasetIds) {
        const name = STORE_ROWS_PREFIX + datasetId;
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: '__row' });
          ensureRowStoreIndexes(store);
        } else {
          ensureRowStoreIndexes(tx.objectStore(name));
        }
      }
    },
  });
}

function ensureRowStoreIndexes(store: {
  indexNames: DOMStringList;
  createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters): unknown;
}): void {
  if (!store.indexNames.contains(INDEX_DATE)) {
    store.createIndex(INDEX_DATE, '__date');
  }
  if (!store.indexNames.contains(INDEX_SEARCH_TOKEN)) {
    store.createIndex(INDEX_SEARCH_TOKEN, '__searchTokens', { multiEntry: true });
  }
}

async function openImportDbReadonly(importId: string): Promise<IDBPDatabase> {
  return openDB(importDbName(importId));
}

export async function listImports(): Promise<ImportMeta[]> {
  const db = await openMetaDb();
  const all = (await db.getAll(STORE_IMPORTS)) as ImportMeta[];
  db.close();
  const enriched = await Promise.all(all.map(hydrateImportMeta));
  return enriched.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getImport(id: string): Promise<ImportMeta | undefined> {
  const db = await openMetaDb();
  const m = (await db.get(STORE_IMPORTS, id)) as ImportMeta | undefined;
  db.close();
  return m ? hydrateImportMeta(m) : undefined;
}

export async function saveImportMeta(meta: ImportMeta): Promise<void> {
  const db = await openMetaDb();
  await db.put(STORE_IMPORTS, meta);
  db.close();
}

async function enrichImportLinkedInProfile(meta: ImportMeta): Promise<ImportMeta> {
  if (meta.linkedInProfile) return meta;

  const sourceDatasets = await linkedInProfileSourceDatasets(meta);
  const linkedInProfile = inferLinkedInProfileInfo(sourceDatasets);
  if (!linkedInProfile) return meta;

  const next = { ...meta, linkedInProfile };
  await saveImportMeta(next);
  return next;
}

async function hydrateImportMeta(meta: ImportMeta): Promise<ImportMeta> {
  const reconciled = reconcileImportMeta(meta);
  if (reconciled !== meta) {
    meta = reconciled;
    await saveImportMeta(meta);
  }

  return enrichImportLinkedInProfile(meta);
}

function reconcileImportMeta(meta: ImportMeta): ImportMeta {
  let changed = false;

  const datasets = meta.datasets.map((dataset) => {
    const schema = getSchemaById(dataset.schemaId);
    if (!schema) return dataset;

    const nextCategory = schema.category;
    const nextTitle = schema.title;
    const nextDateField = schema.dateField ?? dataset.dateField;

    if (
      dataset.category === nextCategory &&
      dataset.title === nextTitle &&
      dataset.dateField === nextDateField
    ) {
      return dataset;
    }

    changed = true;
    return {
      ...dataset,
      category: nextCategory,
      title: nextTitle,
      dateField: nextDateField,
    };
  });

  return changed ? { ...meta, datasets } : meta;
}

async function linkedInProfileSourceDatasets(
  meta: ImportMeta,
): Promise<LinkedInProfileSourceDataset[]> {
  const sources = meta.datasets.filter((dataset) =>
    LINKEDIN_PROFILE_SOURCE_SCHEMA_IDS.has(dataset.schemaId),
  );
  return Promise.all(
    sources.map(async (dataset) => ({
      schemaId: dataset.schemaId,
      rows: stringRowsForProfileInference(
        await queryDataset(meta.id, dataset.datasetId, {
          limit: profileInferenceLimit(dataset.schemaId, dataset.rowCount),
        }),
      ),
    })),
  );
}

function stringRowsForProfileInference(rows: DatasetRow[]): Array<Record<string, string>> {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  });
}

function profileInferenceLimit(schemaId: string, rowCount: number): number {
  if (schemaId === 'profile') return 1;
  if (schemaId === 'invitations') return Math.min(rowCount, 500);
  return Math.min(rowCount, 200);
}

export interface CreateImportInput {
  label: string;
  linkedInProfile?: LinkedInProfileInfo;
  datasets: Array<{
    datasetId: string;
    schemaId: string;
    filename: string;
    title: string;
    category: string;
    dateField?: string;
    rows: Array<Record<string, string>>;
  }>;
}

export interface CreateImportProgress {
  file?: string;
  completed: number;
  total: number;
}

export interface CreateImportOptions {
  chunkSize?: number;
  onProgress?: (progress: CreateImportProgress) => void | Promise<void>;
  signal?: AbortSignal;
}

const DEFAULT_IMPORT_CHUNK_SIZE = 500;

export async function createImport(
  input: CreateImportInput,
  options: CreateImportOptions = {},
): Promise<ImportMeta> {
  const id = newImportId();
  const datasetMetas: DatasetMeta[] = [];
  const totalRows = input.datasets.reduce((sum, dataset) => sum + dataset.rows.length, 0);
  const chunkSize = Math.max(1, Math.floor(options.chunkSize ?? DEFAULT_IMPORT_CHUNK_SIZE));
  let storedRows = 0;
  const { signal } = options;

  await options.onProgress?.({
    file: input.datasets[0]?.filename,
    completed: 0,
    total: totalRows,
  });

  const datasetIds = input.datasets.map((d) => d.datasetId);
  const db = await openImportDb(id, datasetIds);
  try {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    for (const dataset of input.datasets) {
      const storeName = STORE_ROWS_PREFIX + dataset.datasetId;
      for (let start = 0; start < dataset.rows.length; start += chunkSize) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const end = Math.min(dataset.rows.length, start + chunkSize);

        for (let i = start; i < end; i++) {
          if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
          const row = normalizeDatasetRow(dataset, dataset.rows[i] as Record<string, string>, i);
          // Fire-and-forget individual puts inside the active transaction.
          // Awaiting each put serializes writes and is very slow for large
          // imports. Rely on `tx.done` to surface any put errors instead.
          // Use `void` to satisfy linters about un-awaited promises.
          void store.put(row);
        }

        // Wait for the transaction to complete (this will reject if any put failed)
        await tx.done;
        storedRows += end - start;

        // Report any collected per-row diagnostics for this chunk
        try {
          const diag = snapshotDiagnostics();
          if (diag.count > 0) {
            console.trace('[import diagnostics] chunk', {
              dataset: dataset.datasetId,
              filename: dataset.filename,
              rowsMeasured: diag.count,
              avgNormalizeMs: Math.round((diag.normalizeMs / diag.count) * 100) / 100,
              avgTokenMs: Math.round((diag.tokenMs / diag.count) * 100) / 100,
              totalNormalizeMs: Math.round(diag.normalizeMs),
              totalTokenMs: Math.round(diag.tokenMs),
            });
          }
        } catch (e) {
          console.trace('[import diagnostics] failed to snapshot diagnostics', e);
        }
        await options.onProgress?.({
          file: dataset.filename,
          completed: storedRows,
          total: totalRows,
        });
      }

      datasetMetas.push({
        datasetId: dataset.datasetId,
        schemaId: dataset.schemaId,
        filename: dataset.filename,
        title: dataset.title,
        category: dataset.category,
        rowCount: dataset.rows.length,
        dateField: dataset.dateField,
      });
    }
  } catch (err) {
    db.close();
    await cleanupFailedImport(id);
    throw err;
  } finally {
    // ensure DB is closed if not already
    try {
      db.close();
    } catch {
      // DB already closed — nothing to do
    }
  }

  const meta: ImportMeta = {
    id,
    label: input.label,
    createdAt: Date.now(),
    fileCount: input.datasets.length,
    totalRows,
    linkedInProfile: input.linkedInProfile,
    datasets: datasetMetas,
  };
  await saveImportMeta(meta);
  return meta;
}

// Ensure partial imports are cleaned up on errors (including aborts)
async function cleanupFailedImport(id: string): Promise<void> {
  try {
    await deleteImport(id);
  } catch {
    // best-effort cleanup; swallow errors so original error is preserved
  }
}

export async function deleteImport(id: string): Promise<void> {
  const metaDb = await openMetaDb();
  await metaDb.delete(STORE_IMPORTS, id);
  const settings = ((await metaDb.get(STORE_SETTINGS, SETTINGS_KEY)) as
    | AppSettings
    | undefined) ?? {
    activeImportId: null,
  };
  if (settings.activeImportId === id) {
    await metaDb.put(STORE_SETTINGS, { ...settings, activeImportId: null }, SETTINGS_KEY);
  }
  metaDb.close();

  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(importDbName(id));
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

export async function getActiveImportId(): Promise<string | null> {
  const db = await openMetaDb();
  const settings = (await db.get(STORE_SETTINGS, SETTINGS_KEY)) as AppSettings | undefined;
  db.close();
  return settings?.activeImportId ?? null;
}

export async function setActiveImportId(id: string | null): Promise<void> {
  const db = await openMetaDb();
  const current = ((await db.get(STORE_SETTINGS, SETTINGS_KEY)) as AppSettings | undefined) ?? {
    activeImportId: null,
  };
  await db.put(STORE_SETTINGS, { ...current, activeImportId: id }, SETTINGS_KEY);
  db.close();
}

export interface QueryOptions {
  offset?: number;
  limit?: number;
  search?: string;
  dateRange?: DateRange;
  dateField?: string;
  sort?: QuerySort;
}

export interface DateRange {
  from?: number;
  to?: number;
}

export type QuerySort = 'row' | 'date-asc' | 'date-desc';

export async function queryDataset(
  importId: string,
  datasetId: string,
  options: QueryOptions = {},
): Promise<DatasetRow[]> {
  const query = prepareQuery(options);
  if (query.limit === 0) return [];
  const db = await openImportDbReadonly(importId);
  try {
    const storeName = STORE_ROWS_PREFIX + datasetId;
    if (!db.objectStoreNames.contains(storeName)) return [];
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    if (query.searchTerms.length > 0 && storeHasIndex(store, INDEX_SEARCH_TOKEN)) {
      return await queryBySearchIndex(store, query);
    }
    if (query.searchTerms.length === 0 && query.dateRange && storeHasIndex(store, INDEX_DATE)) {
      return await queryByDateIndex(store, query);
    }
    return await queryByScan(store, query);
  } finally {
    db.close();
  }
}

export async function countDataset(
  importId: string,
  datasetId: string,
  options: Omit<QueryOptions, 'offset' | 'limit' | 'sort'> = {},
): Promise<number> {
  const query = prepareQuery({ ...options, offset: 0, limit: Number.MAX_SAFE_INTEGER });
  const db = await openImportDbReadonly(importId);
  try {
    const storeName = STORE_ROWS_PREFIX + datasetId;
    if (!db.objectStoreNames.contains(storeName)) return 0;
    if (!hasQueryFilters(query)) return await db.count(storeName);

    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    if (query.searchTerms.length > 0 && storeHasIndex(store, INDEX_SEARCH_TOKEN)) {
      return await countBySearchIndex(store, query);
    }
    if (query.searchTerms.length === 0 && query.dateRange && storeHasIndex(store, INDEX_DATE)) {
      const keyRange = dateKeyRange(query.dateRange);
      return keyRange ? await store.index(INDEX_DATE).count(keyRange) : 0;
    }
    return await countByScan(store, query);
  } finally {
    db.close();
  }
}

interface PreparedQuery {
  offset: number;
  limit: number;
  searchTerms: string[];
  dateRange?: ResolvedDateRange;
  dateField?: string;
  sort: QuerySort;
}

interface ResolvedDateRange {
  from?: number;
  to?: number;
  empty?: boolean;
}

const DATE_FIELD_RE =
  /(date|time|created|updated|sent|received|registered|verified|issued|started|finished|followed|connected|login|challenge|transaction|application|watched)/i;

function normalizeDatasetRow(
  dataset: CreateImportInput['datasets'][number],
  source: Record<string, string>,
  rowIndex: number,
): DatasetRow {
  const t0 = nowMs();
  const row: DatasetRow = { ...source, __row: rowIndex };
  const dates = normalizedDatesForRow(source, dataset.dateField);
  if (Object.keys(dates).length > 0) {
    row.__dates = dates;
    const primaryField = primaryDateField(dates, dataset.dateField);
    const primary = primaryField ? dates[primaryField] : undefined;
    if (primary?.epochMs !== undefined) {
      row.__date = primary.epochMs;
      row.__dateField = primaryField;
      row.__datePrecision = primary.precision;
    }
  }

  const t1 = nowMs();
  const searchT0 = nowMs();
  const searchTokens = tokenizeSearchText(rowSearchText(source));
  const searchT1 = nowMs();
  if (searchTokens.length > 0) row.__searchTokens = searchTokens;

  // update diagnostics counters (sample every N rows to avoid noisy timers)
  __diagRowCount++;
  __diagNormalizeMs += t1 - t0;
  __diagTokenMs += searchT1 - searchT0;

  return row;
}

function snapshotDiagnostics(): { count: number; normalizeMs: number; tokenMs: number } {
  const out = { count: __diagRowCount, normalizeMs: __diagNormalizeMs, tokenMs: __diagTokenMs };
  __diagRowCount = 0;
  __diagNormalizeMs = 0;
  __diagTokenMs = 0;
  return out;
}

function normalizedDatesForRow(
  row: Record<string, string>,
  dateField: string | undefined,
): Record<string, NormalizedTemporal> {
  const dates: Record<string, NormalizedTemporal> = {};
  for (const [field, value] of Object.entries(row)) {
    if (field !== dateField && !DATE_FIELD_RE.test(field)) continue;
    const temporal = parseTemporalValue(value);
    if (temporal) dates[field] = temporal;
  }
  return dates;
}

function primaryDateField(
  dates: Record<string, NormalizedTemporal>,
  dateField: string | undefined,
): string | undefined {
  if (dateField && dates[dateField]?.epochMs !== undefined) return dateField;
  return Object.keys(dates).find((field) => dates[field]?.epochMs !== undefined);
}

function prepareQuery(options: QueryOptions): PreparedQuery {
  const dateRange = resolveDateRange(options.dateRange);
  return {
    offset: Math.max(0, Math.floor(options.offset ?? 0)),
    limit: Math.max(0, Math.floor(options.limit ?? 50)),
    searchTerms: tokenizeSearchText(options.search ?? ''),
    dateRange,
    dateField: options.dateField,
    sort: options.sort ?? (dateRange ? 'date-desc' : 'row'),
  };
}

function resolveDateRange(range: DateRange | undefined): ResolvedDateRange | undefined {
  if (!range) return undefined;
  const from = finiteNumber(range.from);
  const to = finiteNumber(range.to);
  if (from === undefined && to === undefined) return undefined;
  return { from, to, empty: from !== undefined && to !== undefined && from > to };
}

function finiteNumber(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function hasQueryFilters(query: PreparedQuery): boolean {
  return query.searchTerms.length > 0 || query.dateRange !== undefined;
}

async function queryByDateIndex(
  store: ReturnType<ReturnType<IDBPDatabase['transaction']>['objectStore']>,
  query: PreparedQuery,
): Promise<DatasetRow[]> {
  const keyRange = query.dateRange ? dateKeyRange(query.dateRange) : undefined;
  if (query.dateRange?.empty || !keyRange) return [];
  const direction = query.sort === 'date-asc' ? 'next' : 'prev';
  const out: DatasetRow[] = [];
  const index = store.index(INDEX_DATE);
  let cursor = await index.openCursor(keyRange, direction);
  if (query.offset > 0 && cursor) await cursor.advance(query.offset);
  while (cursor && out.length < query.limit) {
    out.push(cursor.value as DatasetRow);
    cursor = await cursor.continue();
  }
  return out;
}

async function queryBySearchIndex(
  store: ReturnType<ReturnType<IDBPDatabase['transaction']>['objectStore']>,
  query: PreparedQuery,
): Promise<DatasetRow[]> {
  const keys = await candidateKeysForSearch(store, query.searchTerms);
  if (keys.size === 0) return [];

  const rows: DatasetRow[] = [];
  for (const key of keys) {
    const row = (await store.get(key)) as DatasetRow | undefined;
    if (row && rowMatchesQuery(row, query)) rows.push(row);
  }
  return sortRowsForQuery(rows, query).slice(query.offset, query.offset + query.limit);
}

async function queryByScan(
  store: ReturnType<ReturnType<IDBPDatabase['transaction']>['objectStore']>,
  query: PreparedQuery,
): Promise<DatasetRow[]> {
  if (!hasQueryFilters(query) && query.sort === 'row') {
    const out: DatasetRow[] = [];
    let cursor = await store.openCursor();
    if (query.offset > 0 && cursor) await cursor.advance(query.offset);
    while (cursor && out.length < query.limit) {
      out.push(cursor.value as DatasetRow);
      cursor = await cursor.continue();
    }
    return out;
  }

  const rows: DatasetRow[] = [];
  let cursor = await store.openCursor();
  while (cursor) {
    const row = cursor.value as DatasetRow;
    if (rowMatchesQuery(row, query)) rows.push(row);
    cursor = await cursor.continue();
  }
  return sortRowsForQuery(rows, query).slice(query.offset, query.offset + query.limit);
}

async function countBySearchIndex(
  store: ReturnType<ReturnType<IDBPDatabase['transaction']>['objectStore']>,
  query: PreparedQuery,
): Promise<number> {
  const keys = await candidateKeysForSearch(store, query.searchTerms);
  if (keys.size === 0) return 0;

  let count = 0;
  for (const key of keys) {
    const row = (await store.get(key)) as DatasetRow | undefined;
    if (row && rowMatchesQuery(row, query)) count++;
  }
  return count;
}

async function countByScan(
  store: ReturnType<ReturnType<IDBPDatabase['transaction']>['objectStore']>,
  query: PreparedQuery,
): Promise<number> {
  let count = 0;
  let cursor = await store.openCursor();
  while (cursor) {
    if (rowMatchesQuery(cursor.value as DatasetRow, query)) count++;
    cursor = await cursor.continue();
  }
  return count;
}

async function candidateKeysForSearch(
  store: ReturnType<ReturnType<IDBPDatabase['transaction']>['objectStore']>,
  terms: string[],
): Promise<Set<number>> {
  const index = store.index(INDEX_SEARCH_TOKEN);
  let candidates: Set<number> | undefined;
  for (const term of terms) {
    const keys = (await index.getAllKeys(term)).filter(
      (key): key is number => typeof key === 'number',
    );
    const next = new Set(keys);
    candidates = candidates ? intersect(candidates, next) : next;
    if (candidates.size === 0) break;
  }
  return candidates ?? new Set<number>();
}

function intersect(left: Set<number>, right: Set<number>): Set<number> {
  const out = new Set<number>();
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  for (const value of small) {
    if (large.has(value)) out.add(value);
  }
  return out;
}

function rowMatchesQuery(row: DatasetRow, query: PreparedQuery): boolean {
  if (query.dateRange && !rowMatchesDateRange(row, query.dateRange, query.dateField)) return false;
  if (query.searchTerms.length > 0 && !rowMatchesSearch(row, query.searchTerms)) return false;
  return true;
}

function rowMatchesDateRange(
  row: DatasetRow,
  range: ResolvedDateRange,
  dateField: string | undefined,
): boolean {
  if (range.empty) return false;
  const value = rowDate(row, dateField);
  if (!Number.isFinite(value)) return false;
  if (range.from !== undefined && value < range.from) return false;
  if (range.to !== undefined && value > range.to) return false;
  return true;
}

function rowMatchesSearch(row: DatasetRow, terms: string[]): boolean {
  const tokens = Array.isArray(row.__searchTokens)
    ? row.__searchTokens
    : tokenizeSearchText(rowSearchText(row));
  if (tokens.length === 0) return false;
  const tokenSet = new Set(tokens);
  return terms.every((term) => tokenSet.has(term));
}

function sortRowsForQuery(rows: DatasetRow[], query: PreparedQuery): DatasetRow[] {
  if (query.sort === 'date-asc') {
    return [...rows].sort(
      (a, b) => rowDate(a, query.dateField) - rowDate(b, query.dateField) || a.__row - b.__row,
    );
  }
  if (query.sort === 'date-desc') {
    return [...rows].sort(
      (a, b) => rowDate(b, query.dateField) - rowDate(a, query.dateField) || a.__row - b.__row,
    );
  }
  return [...rows].sort((a, b) => a.__row - b.__row);
}

function rowDate(row: DatasetRow, dateField: string | undefined): number {
  if (typeof row.__date === 'number') return row.__date;
  if (!dateField) return Number.NEGATIVE_INFINITY;
  const value = row[dateField];
  if (typeof value !== 'string') return Number.NEGATIVE_INFINITY;
  return parseTemporalValue(value)?.epochMs ?? Number.NEGATIVE_INFINITY;
}

function dateKeyRange(range: ResolvedDateRange): IDBKeyRange | undefined {
  if (range.empty) return undefined;
  if (range.from !== undefined && range.to !== undefined)
    return IDBKeyRange.bound(range.from, range.to);
  if (range.from !== undefined) return IDBKeyRange.lowerBound(range.from);
  if (range.to !== undefined) return IDBKeyRange.upperBound(range.to);
  return undefined;
}

function storeHasIndex(
  store: ReturnType<ReturnType<IDBPDatabase['transaction']>['objectStore']>,
  indexName: string,
): boolean {
  return store.indexNames.contains(indexName);
}

function rowSearchText(row: Record<string, DatasetCellValue>): string {
  return Object.entries(row)
    .filter(
      ([key, value]) =>
        !key.startsWith('__') && (typeof value === 'string' || typeof value === 'number'),
    )
    .map(([, value]) => String(value))
    .join(' ');
}

export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const est = await navigator.storage.estimate();
  return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
}

const IMPORT_DB_PREFIX = 'linkedout-import-';

export async function cleanupOrphanedImports(): Promise<void> {
  let knownIds: Set<string>;

  try {
    const db = await openMetaDb();
    const all = (await db.getAll(STORE_IMPORTS)) as ImportMeta[];
    db.close();
    knownIds = new Set(all.map((m) => m.id));
  } catch {
    // If the meta database can't be opened, don't delete anything.
    return;
  }

  const importDbs = await indexedDbDatabases();
  for (const dbInfo of importDbs) {
    const name = dbInfo.name ?? '';
    if (!name.startsWith(IMPORT_DB_PREFIX)) continue;
    const id = name.slice(IMPORT_DB_PREFIX.length);
    if (!knownIds.has(id)) {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve();
      });
    }
  }
}

async function indexedDbDatabases(): Promise<Array<{ name?: string }>> {
  if ('databases' in indexedDB) {
    try {
      return (await indexedDB.databases()) as Array<{ name?: string }>;
    } catch {
      // Some browsers throw on indexedDB.databases() in private mode.
    }
  }
  return [];
}

function newImportId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${Date.now().toString(36)}-${rand}`;
}
