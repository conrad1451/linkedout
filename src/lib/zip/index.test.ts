import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { decodeText, extractExport } from './index';

function buildZip(entries: Record<string, string>): Uint8Array {
  const map: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(entries)) {
    map[path] = strToU8(content);
  }
  return zipSync(map);
}

describe('extractExport', () => {
  it('extracts files from a Uint8Array zip', async () => {
    const zip = buildZip({
      'Profile.csv': 'First Name,Last Name\nAda,Lovelace\n',
      'nested/Comments.csv': 'a,b\n1,2\n',
    });

    const files = await extractExport(zip);
    expect(files.map((f) => f.path)).toEqual(['nested/Comments.csv', 'Profile.csv']);
    const profile = files.find((f) => f.path === 'Profile.csv')!;
    expect(decodeText(profile.bytes)).toBe('First Name,Last Name\nAda,Lovelace\n');
  });

  it('accepts a Blob input', async () => {
    const zip = buildZip({ 'a.csv': 'x\n' });
    const blob = new Blob([zip as BlobPart]);
    const files = await extractExport(blob);
    expect(files).toHaveLength(1);
    expect(files[0]!.path).toBe('a.csv');
  });

  it('skips directory entries', async () => {
    const zip = zipSync({ 'dir/': new Uint8Array(), 'dir/file.csv': strToU8('x\n') });
    const files = await extractExport(zip);
    expect(files.map((f) => f.path)).toEqual(['dir/file.csv']);
  });
});
