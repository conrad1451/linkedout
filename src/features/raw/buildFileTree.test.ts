import { describe, expect, it } from 'vitest';
import type { DatasetMeta } from '../../lib/store';
import { buildFileTree } from './buildFileTree';

describe('buildFileTree', () => {
  it('builds a folder tree from dataset filenames', () => {
    const datasets: DatasetMeta[] = [
      createDataset('connections', 'Connections.csv'),
      createDataset('articles', 'Articles/Articles.csv'),
      createDataset('jobs-applications', 'Jobs/Job Applications.csv'),
      createDataset('jobs-saved', 'Jobs/Saved Jobs.csv'),
      createDataset('verifications', 'Verifications/Verifications.csv'),
    ];

    const tree = buildFileTree(datasets);
    const articlesFolder = tree[0]!;
    const jobsFolder = tree[1]!;
    const connectionsFile = tree[3]!;

    expect(tree.map((node) => node.path)).toEqual([
      'Articles',
      'Jobs',
      'Verifications',
      'Connections.csv',
    ]);

    expect(articlesFolder).toMatchObject({
      name: 'Articles',
      path: 'Articles',
      isFolder: true,
    });
    expect(articlesFolder.datasets.map((dataset) => dataset.datasetId)).toEqual(['articles']);
    expect(articlesFolder.children.map((node) => node.path)).toEqual(['Articles/Articles.csv']);
    expect(articlesFolder.children[0]?.datasets.map((dataset) => dataset.datasetId)).toEqual([
      'articles',
    ]);

    expect(jobsFolder).toMatchObject({
      name: 'Jobs',
      path: 'Jobs',
      isFolder: true,
    });
    expect(jobsFolder.datasets.map((dataset) => dataset.datasetId)).toEqual([
      'jobs-applications',
      'jobs-saved',
    ]);
    expect(jobsFolder.children.map((node) => node.path)).toEqual([
      'Jobs/Job Applications.csv',
      'Jobs/Saved Jobs.csv',
    ]);

    expect(connectionsFile).toMatchObject({
      name: 'Connections.csv',
      path: 'Connections.csv',
      isFolder: false,
    });
    expect(connectionsFile.datasets.map((dataset) => dataset.datasetId)).toEqual(['connections']);
  });

  it('returns an empty tree when there are no datasets', () => {
    expect(buildFileTree([])).toEqual([]);
  });
});

function createDataset(datasetId: string, filename: string): DatasetMeta {
  return {
    datasetId,
    schemaId: datasetId,
    filename,
    title: datasetId,
    category: 'test',
    rowCount: 1,
  };
}
