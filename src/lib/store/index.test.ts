import { beforeEach, describe, expect, it } from 'vitest';
import { openDB } from 'idb';

import {
  countDataset,
  createImport,
  deleteImport,
  getActiveImportId,
  getImport,
  listImports,
  queryDataset,
  setActiveImportId,
} from './index';

// fake-indexeddb is registered in src/test/setup.ts.
async function resetIndexedDb(): Promise<void> {
  const dbs = await indexedDB.databases?.();
  if (!dbs) return;
  await Promise.all(
    dbs
      .filter((d) => d.name)
      .map(
        (d) =>
          new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(d.name as string);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          }),
      ),
  );
}

beforeEach(async () => {
  await resetIndexedDb();
});

describe('store', () => {
  it('starts with no imports and no active id', async () => {
    expect(await listImports()).toEqual([]);
    expect(await getActiveImportId()).toBeNull();
  });

  it('upgrades a legacy meta database that only has settings', async () => {
    const legacy = await openDB('linkedout-meta', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
    legacy.close();

    await expect(listImports()).resolves.toEqual([]);
    await expect(getActiveImportId()).resolves.toBeNull();
  });

  it('creates an import and persists dataset rows', async () => {
    const meta = await createImport({
      label: 'Test export',
      datasets: [
        {
          datasetId: 'comments',
          schemaId: 'comments',
          filename: 'Comments.csv',
          title: 'Comments',
          category: 'comments',
          rows: [
            { Date: '2024-01-01', Link: 'a', Message: 'hello' },
            { Date: '2024-01-02', Link: 'b', Message: 'world' },
          ],
        },
      ],
    });

    expect(meta.fileCount).toBe(1);
    expect(meta.totalRows).toBe(2);
    expect(meta.datasets[0]!.rowCount).toBe(2);

    const all = await listImports();
    expect(all).toHaveLength(1);
    expect(all[0]!.id).toBe(meta.id);

    expect(await countDataset(meta.id, 'comments')).toBe(2);
    const rows = await queryDataset(meta.id, 'comments', { limit: 10 });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.Message).toBe('hello');
    expect(rows[0]!.__row).toBe(0);
  });

  it('reports save progress while writing IndexedDB rows', async () => {
    const events: Array<{ file?: string; completed: number; total: number }> = [];

    await createImport(
      {
        label: 'Progress export',
        datasets: [
          {
            datasetId: 'comments',
            schemaId: 'comments',
            filename: 'Comments.csv',
            title: 'Comments',
            category: 'comments',
            rows: [
              { Date: '2024-01-01', Link: 'a', Message: 'hello' },
              { Date: '2024-01-02', Link: 'b', Message: 'world' },
            ],
          },
          {
            datasetId: 'reactions',
            schemaId: 'reactions',
            filename: 'Reactions.csv',
            title: 'Reactions',
            category: 'activity',
            rows: [{ Date: '2024-01-03', URL: 'c', ReactionType: 'LIKE' }],
          },
        ],
      },
      {
        chunkSize: 1,
        onProgress: (progress) => {
          events.push(progress);
        },
      },
    );

    expect(events[0]).toMatchObject({ file: 'Comments.csv', completed: 0, total: 3 });
    expect(events.at(-1)).toMatchObject({ file: 'Reactions.csv', completed: 3, total: 3 });
    expect(events.map((event) => event.completed)).toEqual([0, 1, 2, 3]);
  });

  it('normalizes date fields and queries by date range', async () => {
    const meta = await createImport({
      label: 'messages',
      datasets: [
        {
          datasetId: 'messages',
          schemaId: 'messages',
          filename: 'messages.csv',
          title: 'Messages',
          category: 'messages',
          dateField: 'DATE',
          rows: [
            { DATE: '2025-12-16 08:51:08 UTC', CONTENT: 'newer note' },
            { DATE: '2025-12-03 12:25:15 UTC', CONTENT: 'older note' },
          ],
        },
      ],
    });

    const rows = await queryDataset(meta.id, 'messages', { limit: 10 });
    expect(rows[0]?.__date).toBe(Date.UTC(2025, 11, 16, 8, 51, 8));
    expect(rows[0]?.__dates?.DATE).toMatchObject({ precision: 'date-time', zone: 'utc' });

    const matches = await queryDataset(meta.id, 'messages', {
      dateRange: {
        from: Date.UTC(2025, 11, 16, 0, 0, 0),
        to: Date.UTC(2025, 11, 16, 23, 59, 59),
      },
      limit: 10,
    });

    expect(matches.map((row) => row.CONTENT)).toEqual(['newer note']);
    expect(
      await countDataset(meta.id, 'messages', {
        dateRange: { from: Date.UTC(2025, 11, 16, 0, 0, 0) },
      }),
    ).toBe(1);
  });

  it('queries rows by indexed keyword tokens', async () => {
    const meta = await createImport({
      label: 'comments',
      datasets: [
        {
          datasetId: 'comments',
          schemaId: 'comments',
          filename: 'Comments.csv',
          title: 'Comments',
          category: 'comments',
          dateField: 'Date',
          rows: [
            { Date: '2025-01-01 10:00:00', Message: 'Reliability matters in rollout planning' },
            { Date: '2025-01-02 10:00:00', Message: 'Coffee chat tomorrow' },
            { Date: '2025-01-03 10:00:00', Message: 'Reliability testing notes' },
          ],
        },
      ],
    });

    const matches = await queryDataset(meta.id, 'comments', {
      search: 'reliability notes',
      limit: 10,
    });

    expect(matches.map((row) => row.Message)).toEqual(['Reliability testing notes']);
    expect(await countDataset(meta.id, 'comments', { search: 'reliability' })).toBe(2);
  });

  it('enriches existing imports with LinkedIn profile metadata', async () => {
    const meta = await createImport({
      label: 'profile metadata',
      datasets: [
        {
          datasetId: 'profile',
          schemaId: 'profile',
          filename: 'Profile.csv',
          title: 'Profile',
          category: 'profile',
          rows: [{ 'First Name': 'Joe', 'Last Name': 'Smith' }],
        },
        {
          datasetId: 'invitations',
          schemaId: 'invitations',
          filename: 'Invitations.csv',
          title: 'Pending Invitation',
          category: 'network',
          rows: [
            {
              From: 'Joe Smith',
              To: 'Maya Smith',
              Direction: 'OUTGOING',
              inviterProfileUrl: 'https://www.linkedin.com/in/joe-smith',
              inviteeProfileUrl: 'https://www.linkedin.com/in/maya-smith-0001',
            },
          ],
        },
      ],
    });

    expect(meta.linkedInProfile).toBeUndefined();

    const [listed] = await listImports();

    expect(listed?.linkedInProfile).toEqual({
      username: 'joe-smith',
      url: 'https://www.linkedin.com/in/joe-smith',
    });
    expect((await getImport(meta.id))?.linkedInProfile?.username).toBe('joe-smith');
  });

  it('reconciles stale dataset categories against the current schema on load', async () => {
    const meta = await createImport({
      label: 'stale categories',
      datasets: [
        {
          datasetId: 'email-addresses',
          schemaId: 'email-addresses',
          filename: 'Email Addresses.csv',
          title: 'Email Addresses',
          category: 'profile',
          rows: [
            {
              'Email Address': 'ada@example.com',
              Confirmed: 'Yes',
              Primary: 'Yes',
              'Updated On': '7/29/25, 1:56 AM',
            },
          ],
        },
      ],
    });

    const [listed] = await listImports();

    expect(listed?.datasets[0]?.category).toBe('privacy');
    expect((await getImport(meta.id))?.datasets[0]?.category).toBe('privacy');
  });

  it('paginates with offset and limit', async () => {
    const rowsIn = Array.from({ length: 5 }, (_, i) => ({ n: String(i) }));
    const meta = await createImport({
      label: 'pager',
      datasets: [
        {
          datasetId: 'nums',
          schemaId: 'nums',
          filename: 'nums.csv',
          title: 'nums',
          category: 'other',
          rows: rowsIn,
        },
      ],
    });

    const page = await queryDataset(meta.id, 'nums', { offset: 2, limit: 2 });
    expect(page.map((r) => r.n)).toEqual(['2', '3']);
  });

  it('persists and clears the active import id', async () => {
    await setActiveImportId('abc');
    expect(await getActiveImportId()).toBe('abc');
    await setActiveImportId(null);
    expect(await getActiveImportId()).toBeNull();
  });

  it('deletes an import and clears the active id pointer', async () => {
    const meta = await createImport({
      label: 'tmp',
      datasets: [
        {
          datasetId: 'comments',
          schemaId: 'comments',
          filename: 'Comments.csv',
          title: 'Comments',
          category: 'comments',
          rows: [{ Date: '2024', Link: 'l', Message: 'm' }],
        },
      ],
    });
    await setActiveImportId(meta.id);
    expect(await getActiveImportId()).toBe(meta.id);

    await deleteImport(meta.id);
    expect(await listImports()).toEqual([]);
    expect(await getActiveImportId()).toBeNull();
  });
});
