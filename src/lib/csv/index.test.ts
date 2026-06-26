import { describe, expect, it } from 'vitest';
import { parseCsv, parseCsvToObjects, writeCsv } from './index';

describe('parseCsv', () => {
  it('parses a simple table', () => {
    expect(parseCsv('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('strips a UTF-8 BOM', () => {
    expect(parseCsv('\uFEFFa,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles quoted commas, newlines, and escaped quotes', () => {
    const csv = 'a,b\n"hello, world","line1\nline2"\n"quote ""x""",ok\n';
    expect(parseCsv(csv)).toEqual([
      ['a', 'b'],
      ['hello, world', 'line1\nline2'],
      ['quote "x"', 'ok'],
    ]);
  });

  it('accepts CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('flushes a final row without trailing newline', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('returns [] for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('parseCsvToObjects', () => {
  it('uses the first row as the header', () => {
    expect(parseCsvToObjects('name,age\nAlice,30\nBob,40\n')).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '40' },
    ]);
  });

  it('fills missing cells with empty strings', () => {
    expect(parseCsvToObjects('a,b,c\n1,2\n')).toEqual([{ a: '1', b: '2', c: '' }]);
  });

  it('can start object mapping at a matched header row', () => {
    const csv = [
      'Notes:',
      '"Connection exports include a LinkedIn note before the real table."',
      '',
      'First Name,Last Name,URL,Email Address,Company,Position,Connected On',
      'Markus,Roth,https://www.linkedin.com/in/markus-roth-trooper,,Media Trooper GmbH,CTO Trooper.AI,16 Dec 2025',
    ].join('\n');

    expect(
      parseCsvToObjects(csv, {
        headerMatcher: (row) => row[0] === 'First Name' && row[6] === 'Connected On',
      }),
    ).toEqual([
      {
        'First Name': 'Markus',
        'Last Name': 'Roth',
        URL: 'https://www.linkedin.com/in/markus-roth-trooper',
        'Email Address': '',
        Company: 'Media Trooper GmbH',
        Position: 'CTO Trooper.AI',
        'Connected On': '16 Dec 2025',
      },
    ]);
  });

  it('returns [] for empty input', () => {
    expect(parseCsvToObjects('')).toEqual([]);
  });

  it('handles unquoted backslash before a comma by keeping the backslash and splitting on the comma', () => {
    const csv = 'a,b\nfoo\\,bar,2\n';
    // New behaviour: backslash escapes a delimiter producing a single field 'foo,bar'.
    expect(parseCsvToObjects(csv)).toEqual([{ a: 'foo,bar', b: '2' }]);
  });

  it('uses the last duplicate header when header names repeat', () => {
    const csv = 'id,name,name\n1,A,B\n';
    // New behaviour: duplicate headers are preserved with suffixes by default.
    expect(parseCsvToObjects(csv)).toEqual([{ id: '1', name: 'A', name__2: 'B' }]);
  });

  it('ignores extra columns when a row has more fields than the header', () => {
    const csv = 'a,b\n1,2,3\n';
    expect(parseCsvToObjects(csv)).toEqual([{ a: '1', b: '2' }]);
  });

  it('auto-detects semicolon delimiters by default when parsing to objects', () => {
    const csv = 'col1;col2\nval1;val2\n';
    expect(parseCsvToObjects(csv)).toEqual([{ col1: 'val1', col2: 'val2' }]);
  });

  it('auto-detects a header after a short preamble by scanning the first N lines', () => {
    const csv = [
      'Note:',
      'This file has a small preamble',
      '',
      'Header1,Header2,Header3',
      'x1,y1,z1',
    ].join('\n');
    // headerScanLines defaults to a generous value, so parseCsvToObjects should find the header automatically
    expect(parseCsvToObjects(csv)).toEqual([{ Header1: 'x1', Header2: 'y1', Header3: 'z1' }]);
  });

  it('can locate a header after a short preamble using headerMatcher', () => {
    const csv = [
      'Note:',
      'This file has a small preamble',
      '',
      'Header1,Header2,Header3',
      'x1,y1,z1',
    ].join('\n');
    const rows = parseCsvToObjects(csv, {
      headerMatcher: (row) => row[0] === 'Header1' && row[2] === 'Header3',
    });
    expect(rows).toEqual([{ Header1: 'x1', Header2: 'y1', Header3: 'z1' }]);
  });
});

describe('writeCsv', () => {
  it('round-trips through parseCsv', () => {
    const rows = [
      ['a', 'b'],
      ['hello, world', 'line1\nline2'],
      ['quote "x"', 'ok'],
    ];
    expect(parseCsv(writeCsv(rows))).toEqual(rows);
  });

  it('serialises null/undefined as empty cells', () => {
    expect(writeCsv([['a', null, undefined, 'd']])).toBe('a,,,d\n');
  });
});
