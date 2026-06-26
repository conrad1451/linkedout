import { CheckCircle2, FolderTree, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImports } from '../../app/useImports';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { RelativeTimeText } from '../../components/RelativeTimeText';
import { StorageMeter } from '../../components/StorageMeter';
import { ImportDropzone } from './ImportDropzone';

export function ImportsPage() {
  const { imports, activeId, activate, remove, loading } = useImports();
  const navigate = useNavigate();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openRawImport = async (importId: string) => {
    if (importId !== activeId) {
      await activate(importId);
    }
    navigate('/raw');
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Imports</h1>
        <p className="mt-1 opacity-70">Your data is stored only in this browser's IndexedDB.</p>
      </header>

      <ImportDropzone />
      <StorageMeter />

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Saved imports</h2>
        {loading && <p className="opacity-70">Loading…</p>}
        {!loading && imports.length === 0 && (
          <EmptyState title="No imports yet" description="Drop a ZIP above to get started." />
        )}
        <ul className="space-y-2">
          {imports.map((imp) => (
            <li
              key={imp.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100 p-4 transition-colors hover:border-primary/40 hover:bg-base-100/80 focus-within:border-primary/50"
              role="button"
              tabIndex={0}
              aria-label={`Open raw data for ${imp.label}`}
              onClick={() => void openRawImport(imp.id)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                void openRawImport(imp.id);
              }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{imp.label}</span>
                  {imp.id === activeId && <span className="badge badge-success">active</span>}
                </div>
                <p className="text-sm opacity-70">
                  {imp.fileCount} files · {imp.totalRows.toLocaleString()} rows ·{' '}
                  <RelativeTimeText value={imp.createdAt} />
                </p>
              </div>
              <div className="flex gap-2">
                {imp.id === activeId && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate('/raw');
                    }}
                  >
                    <FolderTree className="h-4 w-4" />
                    Raw Data
                  </button>
                )}
                {imp.id !== activeId && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline btn-success"
                    onClick={(event) => {
                      event.stopPropagation();
                      void activate(imp.id);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Set active
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-error btn-outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirmId(imp.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete this import?"
        description="This permanently removes the data from your browser."
        confirmLabel="Delete"
        variant="error"
        onCancel={() => setConfirmId(null)}
        onConfirm={async () => {
          if (!confirmId) return;
          await remove(confirmId);
          setConfirmId(null);
        }}
      />
    </div>
  );
}
