import { useContext } from 'react';
import { ImportsCtx, type ImportsState } from './imports-context';
import type { ImportMeta } from '../lib/store';

export function useImports(): ImportsState {
  const ctx = useContext(ImportsCtx);
  if (!ctx) throw new Error('useImports must be used within ImportsProvider');
  return ctx;
}

export function useActiveImport(): ImportMeta | null {
  const { imports, activeId } = useImports();
  return imports.find((i) => i.id === activeId) ?? null;
}
