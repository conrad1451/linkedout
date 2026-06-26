import type { DatasetMeta } from '../../lib/store';

export interface FileTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  datasets: DatasetMeta[];
  children: FileTreeNode[];
}

interface MutableFileTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  datasets: DatasetMeta[];
  children: Map<string, MutableFileTreeNode>;
}

export function buildFileTree(datasets: DatasetMeta[]): FileTreeNode[] {
  const root = createFolderNode('', '');

  for (const dataset of datasets) {
    insertDataset(root, dataset);
  }

  return sortNodes(Array.from(root.children.values())).map(finalizeNode);
}

function insertDataset(root: MutableFileTreeNode, dataset: DatasetMeta) {
  const parts = dataset.filename.split('/').filter(Boolean);
  if (parts.length === 0) return;

  let current = root;
  for (const [index, part] of parts.entries()) {
    const path = parts.slice(0, index + 1).join('/');
    const isFile = index === parts.length - 1;
    const existing = current.children.get(path);
    const node = existing ?? (isFile ? createFileNode(part, path) : createFolderNode(part, path));

    if (!existing) current.children.set(path, node);

    node.datasets.push(dataset);
    current = node;
  }
}

function createFolderNode(name: string, path: string): MutableFileTreeNode {
  return {
    name,
    path,
    isFolder: true,
    datasets: [],
    children: new Map(),
  };
}

function createFileNode(name: string, path: string): MutableFileTreeNode {
  return {
    name,
    path,
    isFolder: false,
    datasets: [],
    children: new Map(),
  };
}

function sortNodes(nodes: MutableFileTreeNode[]): MutableFileTreeNode[] {
  return [...nodes].sort((left, right) => {
    if (left.isFolder !== right.isFolder) return left.isFolder ? -1 : 1;
    return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function finalizeNode(node: MutableFileTreeNode): FileTreeNode {
  return {
    name: node.name,
    path: node.path,
    isFolder: node.isFolder,
    datasets: node.datasets,
    children: sortNodes(Array.from(node.children.values())).map(finalizeNode),
  };
}
