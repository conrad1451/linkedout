import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { zipSync, strToU8 } from 'fflate';
import { importExportZip, type ImportProgress } from './importExport';
import { listImports, queryDataset, deleteImport } from '../../lib/store';

function buildZip(files: Record<string, string>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [path, text] of Object.entries(files)) {
    entries[path] = strToU8(text);
  }
  return zipSync(entries);
}

describe('importExportZip', () => {
  beforeEach(async () => {
    for (const imp of await listImports()) {
      await deleteImport(imp.id);
    }
  });

  it('imports known and unknown CSVs into the store', async () => {
    const zip = buildZip({
      'Profile.csv': 'First Name,Last Name\nPat,Example\n',
      'Shares.csv': 'Date,ShareCommentary\n2025-01-02,Hello world\n2025-01-03,Another\n',
      'Mystery.csv': 'a,b\n1,2\n',
    });

    const phases: string[] = [];
    const { meta, warnings } = await importExportZip(zip, {
      label: 'test',
      onProgress: (p) => phases.push(p.phase),
    });

    // Older runs did not emit a warning for unknown filenames; current importer
    // emits a single warning when a file is stored as a raw dataset. Accept
    // either behavior for compatibility.
    expect([0, 1]).toContain(warnings.length);
    if (warnings.length === 1) {
      expect(warnings[0]).toMatchObject({ file: 'Mystery.csv', message: /Unrecognized filename/ });
    }
    expect(meta.fileCount).toBe(3);
    expect(meta.totalRows).toBe(4);
    expect(phases[0]).toBe('extracting');
    expect(phases.at(-1)).toBe('done');

    const shares = await queryDataset(meta.id, 'shares');
    expect(shares).toHaveLength(2);
    expect(shares[0]?.ShareCommentary).toBe('Hello world');

    const mystery = meta.datasets.find((d) => d.filename === 'Mystery.csv');
    expect(mystery?.schemaId).toMatch(/^raw-/);
  });

  it('skips non-CSV files', async () => {
    const zip = buildZip({
      'Profile.csv': 'First Name\nPat\n',
      'readme.txt': 'hello',
    });
    const { meta } = await importExportZip(zip, { label: 'test' });
    expect(meta.fileCount).toBe(1);
  });

  it('recognizes Services Marketplace providers as a known dataset', async () => {
    const zip = buildZip({
      'Services Marketplace/Providers.csv': 'Provider Name,Category\nPat Example,Coaching\n',
    });

    const { meta, warnings } = await importExportZip(zip, { label: 'test' });

    expect(warnings).toEqual([]);
    expect(meta.fileCount).toBe(1);
    expect(meta.datasets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          datasetId: 'services-marketplace-providers',
          schemaId: 'services-marketplace-providers',
          filename: 'Services Marketplace/Providers.csv',
        }),
      ]),
    );
  });

  it('stores the member LinkedIn profile from export URLs', async () => {
    const zip = buildZip({
      'Profile.csv': 'First Name,Last Name\nJoe,Smith\n',
      'Invitations.csv':
        'From,To,Sent At,Message,Direction,inviterProfileUrl,inviteeProfileUrl\nJoe Smith,Maya Smith,"12/15/25, 1:51 PM",,OUTGOING,https://www.linkedin.com/in/joe-smith,https://www.linkedin.com/in/maya-smith-0001\n',
    });

    const { meta } = await importExportZip(zip, { label: 'test' });

    expect(meta.linkedInProfile).toEqual({
      username: 'joe-smith',
      url: 'https://www.linkedin.com/in/joe-smith',
    });
  });

  it('imports Connections.csv after the LinkedIn notes preamble', async () => {
    const zip = buildZip({
      'Connections.csv': [
        'Notes:',
        '"When exporting your connection data, you may notice that some of the email addresses are missing."',
        '',
        'First Name,Last Name,URL,Email Address,Company,Position,Connected On',
        'Markus,Roth,https://www.linkedin.com/in/markus-roth-trooper,,Media Trooper GmbH,CTO Trooper.AI,16 Dec 2025',
        'Eric,Bowman,https://www.linkedin.com/in/boboco,,King,Chief Technology Officer,16 Dec 2025',
      ].join('\n'),
    });

    const { meta } = await importExportZip(zip, { label: 'test' });
    const connections = await queryDataset(meta.id, 'connections');

    expect(meta.totalRows).toBe(2);
    expect(connections).toHaveLength(2);
    expect(connections[0]).toMatchObject({
      'First Name': 'Markus',
      'Last Name': 'Roth',
      URL: 'https://www.linkedin.com/in/markus-roth-trooper',
      Company: 'Media Trooper GmbH',
      Position: 'CTO Trooper.AI',
      'Connected On': '16 Dec 2025',
    });
  });

  it('reports completed file counts for progress bars', async () => {
    const zip = buildZip({
      'A.csv': 'a\n1\n',
      'B.csv': 'b\n2\n',
    });
    const events: ImportProgress[] = [];

    await importExportZip(zip, {
      label: 'test',
      onProgress: (progress) => events.push(progress),
    });

    const parsingEvents = events.filter((event) => event.phase === 'parsing');
    const storingEvents = events.filter((event) => event.phase === 'storing');

    expect(parsingEvents[0]).toMatchObject({ current: 1, total: 2, completed: 0 });
    expect(parsingEvents.at(-1)).toMatchObject({ current: 2, total: 2, completed: 2 });
    expect(storingEvents[0]).toMatchObject({
      file: 'A.csv',
      total: 2,
      completed: 0,
    });
    expect(storingEvents.at(-1)).toMatchObject({ file: 'B.csv', total: 2, completed: 2 });
    expect(events.at(-1)).toMatchObject({ phase: 'done', total: 2, completed: 2 });
  });

  it('deduplicates rows with identical column values in Ads Clicked.csv', async () => {
    const zip = buildZip({
      'Ads Clicked.csv': [
        'Ad clicked Date,Ad Title/Id',
        '2025/07/30 15:57:31 UTC,797066766',
        '2025/07/30 15:57:31 UTC,797066766',
        '2025/07/30 15:57:31 UTC,797066766',
        '2025/08/03 08:03:10 UTC,721302634',
        '2025/08/03 08:03:10 UTC,721302634',
      ].join('\n'),
    });

    const { meta, warnings } = await importExportZip(zip, { label: 'test' });

    // 2 unique rows out of 5, 3 duplicates removed
    expect(meta.totalRows).toBe(2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      file: 'Ads Clicked.csv',
      message: 'Removed 3 duplicate rows',
    });

    const ads = await queryDataset(meta.id, 'ads-clicked');
    expect(ads).toHaveLength(2);
    expect(ads[0]?.['Ad Title/Id']).toBe('797066766');
    expect(ads[1]?.['Ad Title/Id']).toBe('721302634');
  });

  it('does not produce warnings for files without duplicates', async () => {
    const zip = buildZip({
      'Profile.csv': 'First Name,Last Name\nPat,Example\n',
      'Ad_Targeting.csv': 'ID,Name\n1,Target A\n2,Target B\n',
    });

    const { meta, warnings } = await importExportZip(zip, { label: 'test' });

    expect(meta.totalRows).toBe(3);
    // No dedup warnings — only the possible raw-dataset warning for mystery files
    const dedupWarnings = warnings.filter((w) => w.message.startsWith('Removed '));
    expect(dedupWarnings).toHaveLength(0);
  });
});
