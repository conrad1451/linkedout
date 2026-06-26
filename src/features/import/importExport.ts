import { parseCsvToObjects, type CsvRow, type ParseCsvToObjectsOptions } from '../../lib/csv';
import { cleanShareCommentary } from '../../lib/linkedin/clean';
import { inferLinkedInProfileInfo } from '../../lib/linkedin/profile';
import { decodeText, extractExport, type ExportFile } from '../../lib/zip';
import { resolveSchemaForFile, findSchemaForFile, type DatasetSchema } from '../../lib/schema';
import { createImport, type CreateImportInput, type ImportMeta } from '../../lib/store';

const DEDUP_KEY_SEPARATOR = '\0';

/**
 * Remove exact-duplicate rows from a parsed CSV.
 * Two rows are considered duplicates when all their column values are identical.
 * Preserves the first occurrence of each row.
 */
function deduplicateRows(rows: Array<Record<string, string>>): {
  rows: Array<Record<string, string>>;
  removed: number;
} {
  if (rows.length <= 1) return { rows, removed: 0 };
  const seen = new Set<string>();
  const deduped: Array<Record<string, string>> = [];
  for (const row of rows) {
    const key = Object.values(row).join(DEDUP_KEY_SEPARATOR);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return { rows: deduped, removed: rows.length - deduped.length };
}

export interface ImportProgress {
  phase: 'extracting' | 'parsing' | 'storing' | 'done';
  file?: string;
  current?: number;
  total?: number;
  completed?: number;
}

export interface ImportWarning {
  file: string;
  message: string;
}

export interface ImportResult {
  meta: ImportMeta;
  warnings: ImportWarning[];
}

export interface ImportOptions {
  label?: string;
  onProgress?: (progress: ImportProgress) => void;
  signal?: AbortSignal;
}

export async function importExportZip(
  source: Blob | ArrayBuffer | Uint8Array,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const { onProgress, label } = options;
  const { signal } = options;
  await reportProgress(onProgress, { phase: 'extracting', completed: 0 });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const files = await extractExport(source);

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const csvFiles = files.filter((f) => f.path.toLowerCase().endsWith('.csv'));

  const warnings: ImportWarning[] = [];
  const seenIds = new Map<string, number>();
  const datasets: CreateImportInput['datasets'] = [];

  for (let i = 0; i < csvFiles.length; i++) {
    const file = csvFiles[i]!;
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    await reportProgress(onProgress, {
      phase: 'parsing',
      file: file.path,
      current: i + 1,
      total: csvFiles.length,
      completed: i,
    });

    const matched = findSchemaForFile(file.path);
    const schema = matched ?? resolveSchemaForFile(file.path);
    const datasetId = uniqueId(schema, file, seenIds);

    // Warn when filename did not match a known schema and was stored as a raw dataset
    if (!matched) {
      warnings.push({
        file: file.path,
        message: `Unrecognized filename; stored as raw dataset "${schema.title}"`,
      });
    }

    let rows: Array<Record<string, string>>;
    try {
      const text = decodeText(file.bytes);
      rows = parseCsvToObjects(text, parseOptionsForSchema(schema));
    } catch (err) {
      warnings.push({ file: file.path, message: errorMessage(err) });
      await reportProgress(onProgress, {
        phase: 'parsing',
        file: file.path,
        current: i + 1,
        total: csvFiles.length,
        completed: i + 1,
      });
      continue;
    }

    // Deduplicate exact-duplicate rows (all column values identical).
    // Some datasets (e.g. Ads Clicked) contain many repeated rows.
    if (rows.length > 1) {
      const result = deduplicateRows(rows);
      if (result.removed > 0) {
        warnings.push({
          file: file.path,
          message: `Removed ${result.removed} duplicate row${result.removed === 1 ? '' : 's'}`,
        });
        rows = result.rows;
      }
    }

    // LinkedIn wraps each paragraph of a ShareCommentary in escaped quotes.
    // Strip them so the text matches what the user originally wrote.
    if (schema.id === 'shares') {
      for (const row of rows) {
        const raw = row['ShareCommentary'];
        if (raw) row['ShareCommentary'] = cleanShareCommentary(raw);
      }
    }

    datasets.push({
      datasetId,
      schemaId: schema.id,
      filename: file.path,
      title: schema.title,
      category: schema.category,
      dateField: schema.dateField,
      rows,
    });

    await reportProgress(onProgress, {
      phase: 'parsing',
      file: file.path,
      current: i + 1,
      total: csvFiles.length,
      completed: i + 1,
    });
  }

  const totalRows = datasets.reduce((sum, dataset) => sum + dataset.rows.length, 0);
  const meta = await createImport(
    {
      label: label ?? defaultLabel(),
      linkedInProfile: inferLinkedInProfileInfo(datasets),
      datasets,
    },
    {
      onProgress: async ({ file, completed, total }) => {
        await reportProgress(onProgress, {
          phase: 'storing',
          file,
          completed,
          total,
        });
      },
      signal,
    },
  );
  await reportProgress(onProgress, {
    phase: 'done',
    total: totalRows,
    completed: totalRows,
  });

  return { meta, warnings };
}

async function reportProgress(
  onProgress: ImportOptions['onProgress'],
  progress: ImportProgress,
): Promise<void> {
  if (!onProgress) return;
  onProgress(progress);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function uniqueId(schema: DatasetSchema, file: ExportFile, seen: Map<string, number>): string {
  const base = schema.id;
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  if (count === 0 && schema.filename === normalize(file.path)) {
    return base;
  }
  if (count === 0) {
    return base;
  }
  return `${base}-${count + 1}`;
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

function defaultLabel(): string {
  return `Import ${new Date().toISOString().replace('T', ' ').slice(0, 16)}`;
}

const CONNECTIONS_HEADER = [
  'First Name',
  'Last Name',
  'URL',
  'Email Address',
  'Company',
  'Position',
  'Connected On',
] as const;

function parseOptionsForSchema(schema: DatasetSchema): ParseCsvToObjectsOptions | undefined {
  if (schema.id !== 'connections') return undefined;
  return { headerMatcher: isConnectionsHeader };
}

function isConnectionsHeader(row: CsvRow): boolean {
  return CONNECTIONS_HEADER.every((header, index) => row[index]?.trim() === header);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
