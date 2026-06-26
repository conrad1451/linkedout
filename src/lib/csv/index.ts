export type CsvRow = string[];

export interface ParseCsvToObjectsOptions {
  headerMatcher?: (row: CsvRow, index: number, rows: CsvRow[]) => boolean;
  // If true, attempt to auto-detect the delimiter from the first few lines.
  detectDelimiter?: boolean;
  // Override the delimiter explicitly.
  delimiter?: string;
  // Whether to treat backslash as an escape character (\, \n etc.).
  allowBackslashEscape?: boolean;
  // Number of lines to scan for a header when a header matcher is not provided.
  headerScanLines?: number;
  // How to handle duplicate headers: 'last' mirrors previous behaviour,
  // 'suffix' appends __2/__3, 'arrays' collects duplicate values into arrays.
  preserveDuplicates?: 'last' | 'suffix' | 'arrays';
}

export interface ParseCsvOptions {
  delimiter?: string;
  detectDelimiter?: boolean;
  allowBackslashEscape?: boolean;
}

function detectDelimiterFromText(text: string): string {
  const candidates = [',', ';', '\t', '|'];
  const lines = text
    .split(/\r\n|\n|\r/)
    .slice(0, 10)
    .filter(Boolean);
  if (lines.length === 0) return ',';
  let best = ',';
  let bestScore = -Infinity;
  for (const d of candidates) {
    // score: average number of fields per line
    const counts = lines.map((l) => l.split(d).length);
    const avg = counts.reduce((s, v) => s + v, 0) / counts.length;
    if (avg > bestScore) {
      bestScore = avg;
      best = d;
    }
  }
  return best;
}

export function parseCsv(input: string, options: ParseCsvOptions = {}): CsvRow[] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const delimiter =
    options.delimiter ?? (options.detectDelimiter ? detectDelimiterFromText(text) : ',');
  const allowBackslash = !!options.allowBackslashEscape;

  const rows: CsvRow[] = [];
  let row: CsvRow = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      if (allowBackslash && c === '\\' && i + 1 < len) {
        field += text[i + 1];
        i += 2;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (allowBackslash && c === '\\' && i + 1 < len) {
      field += text[i + 1];
      i += 2;
      continue;
    }
    if (c === delimiter) {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseCsvToObjects<
  T extends Record<string, string | string[]> = Record<string, string | string[]>,
>(input: string, options: ParseCsvToObjectsOptions = {}): T[] {
  const parseOpts: ParseCsvOptions = {
    detectDelimiter: options.detectDelimiter ?? true,
    allowBackslashEscape: options.allowBackslashEscape ?? true,
    delimiter: options.delimiter,
  };

  const rows = parseCsv(input, parseOpts);
  if (rows.length === 0) return [];

  const headerIndex = resolveHeaderIndex(rows, options);
  const header = rows[headerIndex] ?? [];

  const preserve = options.preserveDuplicates ?? 'suffix';
  // Build derived header keys (handles duplicate headers)
  const headerCounts = new Map<string, number>();
  const headerKeys: string[] = [];
  for (let i = 0; i < header.length; i++) {
    const raw = header[i] ?? '';
    if (!raw) {
      headerKeys.push('');
      continue;
    }
    const count = headerCounts.get(raw) ?? 0;
    headerCounts.set(raw, count + 1);
    if (count === 0) {
      headerKeys.push(raw);
    } else {
      if (preserve === 'suffix') headerKeys.push(`${raw}__${count + 1}`);
      else headerKeys.push(raw);
    }
  }

  const out: T[] = [];
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
    const cells = rows[rowIndex] ?? [];
    const obj: Record<string, string | string[]> = {};

    for (let cellIndex = 0; cellIndex < header.length; cellIndex++) {
      const rawKey = header[cellIndex] ?? '';
      if (!rawKey) continue;
      const key = headerKeys[cellIndex] ?? '';
      if (!key) continue;
      const value = cells[cellIndex] ?? '';

      if (preserve === 'arrays') {
        if (key in obj) {
          const cur = obj[key];
          if (Array.isArray(cur)) {
            cur.push(value);
          } else {
            obj[key] = [String(cur), value];
          }
        } else {
          obj[key] = value;
        }
      } else {
        // 'suffix' or 'last' behaviour: store under the computed key
        obj[key] = value;
      }
    }
    out.push(obj as T);
  }
  return out;
}

function resolveHeaderIndex(rows: CsvRow[], options: ParseCsvToObjectsOptions): number {
  if (options.headerMatcher) {
    const headerIndex = rows.findIndex((row, index) => options.headerMatcher?.(row, index, rows));
    return headerIndex >= 0 ? headerIndex : 0;
  }

  const scan = options.headerScanLines ?? 20;
  const max = Math.min(rows.length, Math.max(1, scan));
  for (let i = 0; i < max; i++) {
    const row = rows[i] ?? [];
    if (looksLikeHeader(row)) return i;
  }
  return 0;
}

function looksLikeHeader(row: CsvRow): boolean {
  const nonEmpty = row.filter((c) => (c ?? '').trim() !== '').length;
  if (nonEmpty < 2) return false;
  // At least one cell should contain a letter (heuristic)
  return row.some((c) => /[A-Za-z]/.test(c ?? ''));
}

function needsQuoting(s: string): boolean {
  return /[",\r\n]/.test(s);
}

export function writeCsv(
  rows: ReadonlyArray<ReadonlyArray<string | null | undefined>>,
  eol = '\n',
): string {
  const lines: string[] = [];
  for (const row of rows) {
    const cells = row.map((v) => {
      const s = v == null ? '' : String(v);
      return needsQuoting(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    });
    lines.push(cells.join(','));
  }
  return lines.join(eol) + eol;
}
