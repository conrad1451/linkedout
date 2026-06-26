import { describe, expect, it } from 'vitest';
import { parseLinkedInFormat, extractAlertSummary } from './job-alert-parser';

// ---------------------------------------------------------------------------
// Real rows from test-data/SavedJobAlerts.csv
// ---------------------------------------------------------------------------

const ROW_1_ALERT =
  '{smartExpansionEnabled=true, channels=[INAPP_NOTIFICATION, EMAIL], frequency=DAILY}';
const ROW_1_QUERY =
  '{keywords=staff engineer, spellCheckEnabled=true, searchLocation={com.linkedin.jobs.matching.SpecificSearchLocation={geoLocations=[{geo=urn:li:geo:104738515}]}}, facets={}}';

const ROW_2_ALERT =
  '{smartExpansionEnabled=true, channels=[INAPP_NOTIFICATION, EMAIL], frequency=DAILY}';
const ROW_2_QUERY =
  '{sortingType=RELEVANCE, keywords=principal engineer, spellCheckEnabled=true, searchLocation={com.linkedin.jobs.matching.SpecificSearchLocation={geoLocations=[{geo=urn:li:geo:105117694}]}}, facets={}}';

const ROW_3_ALERT = '{smartExpansionEnabled=false, channels=[INAPP_NOTIFICATION], frequency=DAILY}';
const ROW_3_QUERY =
  '{keywords=technical evangelist, spellCheckEnabled=true, searchLocation={com.linkedin.jobs.matching.SpecificSearchLocation={geoLocations=[{geo=urn:li:geo:103264854, radiusInKms=40.2335}]}}, facets={workplaceTypes={selectedValues=[urn:li:workplaceType:1, urn:li:workplaceType:3, urn:li:workplaceType:2]}}}';

const ROW_4_ALERT = '{smartExpansionEnabled=true, channels=[INAPP_NOTIFICATION], frequency=WEEKLY}';
const ROW_4_QUERY =
  '{keywords=senior staff engineer, spellCheckEnabled=true, searchLocation={com.linkedin.jobs.matching.SpecificSearchLocation={geoLocations=[{geo=urn:li:geo:100907646}]}}, facets={}}';

// ---------------------------------------------------------------------------
// parseLinkedInFormat
// ---------------------------------------------------------------------------

describe('parseLinkedInFormat', () => {
  it('parses a flat object', () => {
    const result = parseLinkedInFormat('{smartExpansionEnabled=true, frequency=DAILY}');
    expect(result).toEqual({ smartExpansionEnabled: true, frequency: 'DAILY' });
  });

  it('parses numeric values', () => {
    const result = parseLinkedInFormat('{radiusInKms=40.2335, id=123}');
    expect(result).toEqual({ radiusInKms: 40.2335, id: 123 });
  });

  it('parses simple arrays', () => {
    const result = parseLinkedInFormat('[INAPP_NOTIFICATION, EMAIL]');
    expect(result).toEqual(['INAPP_NOTIFICATION', 'EMAIL']);
  });

  it('parses nested objects', () => {
    const result = parseLinkedInFormat('{geoLocations=[{geo=urn:li:geo:104738515}]}');
    expect(result).toEqual({
      geoLocations: [{ geo: 'urn:li:geo:104738515' }],
    });
  });

  it('parses deeply nested structures', () => {
    const result = parseLinkedInFormat(ROW_3_QUERY);
    expect(result).toBeTruthy();
    const obj = result as Record<string, unknown>;
    expect(obj.keywords).toBe('technical evangelist');
    expect(obj.spellCheckEnabled).toBe(true);
    expect(obj.facets).toBeTruthy();
  });

  it('parses empty object', () => {
    expect(parseLinkedInFormat('{}')).toEqual({});
  });

  it('parses empty array', () => {
    expect(parseLinkedInFormat('[]')).toEqual([]);
  });

  it('coerces booleans correctly', () => {
    const result = parseLinkedInFormat('{a=true, b=false}');
    expect(result).toEqual({ a: true, b: false });
  });

  it('keeps URN strings as-is', () => {
    const result = parseLinkedInFormat('[urn:li:workplaceType:1, urn:li:workplaceType:2]');
    expect(result).toEqual(['urn:li:workplaceType:1', 'urn:li:workplaceType:2']);
  });

  it('handles all 4 real alert rows', () => {
    for (const input of [ROW_1_ALERT, ROW_2_ALERT, ROW_3_ALERT, ROW_4_ALERT]) {
      const result = parseLinkedInFormat(input);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('object');
      expect(Array.isArray(result)).toBe(false);
    }
  });

  it('handles all 4 real query rows', () => {
    for (const input of [ROW_1_QUERY, ROW_2_QUERY, ROW_3_QUERY, ROW_4_QUERY]) {
      const result = parseLinkedInFormat(input);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('object');
      expect(Array.isArray(result)).toBe(false);
    }
  });

  it('parses ROW 3 alert correctly', () => {
    const result = parseLinkedInFormat(ROW_3_ALERT) as Record<string, unknown>;
    expect(result.smartExpansionEnabled).toBe(false);
    expect(result.channels).toEqual(['INAPP_NOTIFICATION']);
    expect(result.frequency).toBe('DAILY');
  });

  it('parses ROW 4 alert correctly', () => {
    const result = parseLinkedInFormat(ROW_4_ALERT) as Record<string, unknown>;
    expect(result.smartExpansionEnabled).toBe(true);
    expect(result.frequency).toBe('WEEKLY');
  });
});

// ---------------------------------------------------------------------------
// extractAlertSummary
// ---------------------------------------------------------------------------

describe('extractAlertSummary', () => {
  it('extracts keywords, frequency, channels from row 1', () => {
    const alert = parseLinkedInFormat(ROW_1_ALERT) as Record<string, unknown>;
    const query = parseLinkedInFormat(ROW_1_QUERY) as Record<string, unknown>;
    const summary = extractAlertSummary(alert, query);

    expect(summary.keywords).toBe('staff engineer');
    expect(summary.frequency).toBe('DAILY');
    expect(summary.channels).toEqual(['INAPP_NOTIFICATION', 'EMAIL']);
    expect(summary.smartExpansionEnabled).toBe(true);
    expect(summary.geoUrn).toBe('urn:li:geo:104738515');
    expect(summary.radiusKm).toBeNull();
    expect(summary.workplaceTypeUrns).toEqual([]);
  });

  it('extracts geo with radius from row 3', () => {
    const alert = parseLinkedInFormat(ROW_3_ALERT) as Record<string, unknown>;
    const query = parseLinkedInFormat(ROW_3_QUERY) as Record<string, unknown>;
    const summary = extractAlertSummary(alert, query);

    expect(summary.keywords).toBe('technical evangelist');
    expect(summary.frequency).toBe('DAILY');
    expect(summary.geoUrn).toBe('urn:li:geo:103264854');
    expect(summary.radiusKm).toBe(40.2335);
    expect(summary.workplaceTypeUrns).toEqual([
      'urn:li:workplaceType:1',
      'urn:li:workplaceType:3',
      'urn:li:workplaceType:2',
    ]);
  });

  it('extracts keywords from row 2', () => {
    const alert = parseLinkedInFormat(ROW_2_ALERT) as Record<string, unknown>;
    const query = parseLinkedInFormat(ROW_2_QUERY) as Record<string, unknown>;
    const summary = extractAlertSummary(alert, query);

    expect(summary.keywords).toBe('principal engineer');
    expect(summary.geoUrn).toBe('urn:li:geo:105117694');
  });

  it('extracts keywords from row 4', () => {
    const alert = parseLinkedInFormat(ROW_4_ALERT) as Record<string, unknown>;
    const query = parseLinkedInFormat(ROW_4_QUERY) as Record<string, unknown>;
    const summary = extractAlertSummary(alert, query);

    expect(summary.keywords).toBe('senior staff engineer');
    expect(summary.frequency).toBe('WEEKLY');
    expect(summary.geoUrn).toBe('urn:li:geo:100907646');
  });
});
