/** Parser for LinkedIn's proprietary `{key=value}` job-alert format.
 *
 * LinkedIn's `SavedJobAlerts.csv` stores `ALERT_PARAMETERS` and `QUERY_CONTEXT`
 * in a format that resembles JSON but uses `=` instead of `:`, allows unquoted
 * string values, and separates items with `, ` (comma-space).  This module
 * provides a recursive-descent parser and a helper to extract a human-friendly
 * summary suitable for display in the Jobs page.
 */
export type ParsedLinkedInValue =
  | string
  | number
  | boolean
  | ParsedLinkedInValue[]
  | { [key: string]: ParsedLinkedInValue };

/**
 * Parse a string in LinkedIn's `{key=value, ...}` format into a plain JS value.
 */
export function parseLinkedInFormat(input: string): ParsedLinkedInValue {
  const trimmed = input.trim();
  if (trimmed.startsWith('{')) return parseObject(trimmed);
  if (trimmed.startsWith('[')) return parseArray(trimmed);
  return parsePrimitive(trimmed);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseObject(input: string): Record<string, ParsedLinkedInValue> {
  const inner = stripBraces(input, '{', '}');
  if (inner.length === 0) return {};

  const pairs = splitTopLevel(inner, ', ');
  const result: Record<string, ParsedLinkedInValue> = {};

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue; // malformed — skip
    const key = pair.slice(0, eqIdx).trim();
    const rawValue = pair.slice(eqIdx + 1).trim();
    result[key] = parseLinkedInFormat(rawValue);
  }

  return result;
}

function parseArray(input: string): ParsedLinkedInValue[] {
  const inner = stripBraces(input, '[', ']');
  if (inner.length === 0) return [];

  return splitTopLevel(inner, ', ').map((item) => parseLinkedInFormat(item));
}

function parsePrimitive(raw: string): string | number | boolean {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (!Number.isNaN(num) && String(num) === value) return num;
  return value;
}

function stripBraces(input: string, open: string, close: string): string {
  let s = input.trim();
  if (s.startsWith(open)) s = s.slice(open.length);
  if (s.endsWith(close)) s = s.slice(0, -close.length);
  return s.trim();
}

/**
 * Split `input` on `separator` only when not nested inside `{...}` or `[...]`.
 */
function splitTopLevel(input: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
    } else if (depth === 0 && input.slice(i, i + separator.length) === separator) {
      parts.push(input.slice(start, i));
      start = i + separator.length;
      i += separator.length - 1;
    }
  }

  parts.push(input.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

// ---------------------------------------------------------------------------
// Alert summary extraction
// ---------------------------------------------------------------------------

export interface AlertSummary {
  keywords: string;
  frequency: string;
  channels: string[];
  smartExpansionEnabled: boolean;
  geoUrn: string | null;
  radiusKm: number | null;
  workplaceTypeUrns: string[];
}

/**
 * Extract a display-friendly summary from parsed `ALERT_PARAMETERS` and
 * `QUERY_CONTEXT` objects.
 */
export function extractAlertSummary(
  alertParams: Record<string, unknown>,
  queryContext: Record<string, unknown>,
): AlertSummary {
  const frequency = String(alertParams.frequency ?? '');
  const channels = normalizeStringArray(alertParams.channels);
  const smartExpansionEnabled = Boolean(alertParams.smartExpansionEnabled);
  const keywords = String(queryContext.keywords ?? '');

  // Drill into searchLocation / geoLocations
  const searchLocation = asRecord(queryContext.searchLocation);
  const specificLocation = asRecord(
    searchLocation?.['com.linkedin.jobs.matching.SpecificSearchLocation'],
  );
  const geoLocations = normalizeAnyArray(specificLocation?.geoLocations);
  const firstGeo = asRecord(geoLocations[0]);
  const geoUrn = typeof firstGeo?.geo === 'string' ? firstGeo.geo : null;
  const radiusKm = typeof firstGeo?.radiusInKms === 'number' ? firstGeo.radiusInKms : null;

  // Workplace types from facets
  const facets = asRecord(queryContext.facets);
  const workplaceTypes = asRecord(facets?.workplaceTypes);
  const workplaceTypeUrns = normalizeStringArray(workplaceTypes?.selectedValues);

  return {
    keywords,
    frequency,
    channels,
    smartExpansionEnabled,
    geoUrn,
    radiusKm,
    workplaceTypeUrns,
  };
}

// ---------------------------------------------------------------------------
// Tiny type-narrowing helpers
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  return [];
}

function normalizeAnyArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return [];
}
