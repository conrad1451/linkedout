import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  cleanupOrphanedImports,
  deleteImport as deleteImportFromStore,
  getActiveImportId,
  listImports,
  setActiveImportId,
  type ImportMeta,
} from '../lib/store';
import { ImportsCtx } from './imports-context';

export function ImportsProvider({ children }: { children: ReactNode }) {
  const [imports, setImports] = useState<ImportMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [list, active] = await Promise.all([listImports(), getActiveImportId()]);
    setImports(list);
    const nextActive = active && list.some((i) => i.id === active) ? active : (list[0]?.id ?? null);
    setActiveId(nextActive);
    if (active !== nextActive) {
      await setActiveImportId(nextActive);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Purge any import databases left behind by interrupted imports before
    // loading the import list so they don't appear as phantom storage usage.
    void cleanupOrphanedImports().then(() => refresh());
  }, [refresh]);

  const activate = useCallback(async (id: string | null) => {
    await setActiveImportId(id);
    setActiveId(id);
  }, []);

  const remove = useCallback(
    async (id: string) => {
      await deleteImportFromStore(id);
      await refresh();
    },
    [refresh],
  );

  return (
    <ImportsCtx.Provider value={{ imports, activeId, loading, refresh, activate, remove }}>
      {children}
    </ImportsCtx.Provider>
  );
}
