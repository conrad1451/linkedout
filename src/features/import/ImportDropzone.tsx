import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { OpenOnLinkedInLink } from '../../components/OpenOnLinkedInLink';
import { importExportZip, type ImportProgress, type ImportWarning } from './importExport';
import { useImports } from '../../app/useImports';

export interface ImportDropzoneProps {
  onComplete?: (importId: string) => void;
}

type ImportUiProgress = ImportProgress | { phase: 'finalizing' };

export function ImportDropzone({ onComplete }: ImportDropzoneProps) {
  const { refresh, activate } = useImports();
  const inputRef = useRef<HTMLInputElement>(null);
  const importAbortRef = useRef<AbortController | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ImportUiProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ImportWarning[]>([]);

  // Warn the user when they try to navigate away or refresh during an active import.
  useEffect(() => {
    if (!busy) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [busy]);

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      setWarnings([]);
      try {
        const controller = new AbortController();
        importAbortRef.current = controller;
        const { meta, warnings } = await importExportZip(file, {
          label: file.name.replace(/\.zip$/i, ''),
          onProgress: setProgress,
          signal: controller.signal,
        });
        setProgress({ phase: 'finalizing' });
        await activate(meta.id);
        await refresh();
        setWarnings(warnings);
        onComplete?.(meta.id);
      } catch (e) {
        // Show friendly message when user stops the import
        if (e instanceof DOMException && e.name === 'AbortError') {
          setError('Import stopped');
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        setBusy(false);
        setProgress(null);
        importAbortRef.current = null;
      }
    },
    [activate, refresh, onComplete],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };
  const progressPercent = progress ? importProgressPercent(progress) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <p className="font-semibold">Need the export ZIP first?</p>
        <p className="mt-1 text-sm leading-6 opacity-80">
          <a
            href="https://www.linkedin.com/help/linkedin/answer/a1339364/downloading-your-account-data"
            target="_blank"
            rel="noreferrer"
            className="link link-primary font-medium"
          >
            Download your full LinkedIn data
          </a>{' '}
          and save the archive somewhere on your computer. LinkedIn usually takes a few days to
          prepare the full <code className="rounded bg-base-200 px-1 py-0.5 text-xs">.zip</code>{' '}
          export.
        </p>
        <OpenOnLinkedInLink
          href="https://www.linkedin.com/mypreferences/d/download-my-data"
          format="long"
          size="sm"
          className="mt-3"
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-box border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100'
        }`}
      >
        <p className="text-lg font-semibold">Drop your LinkedIn export ZIP here</p>
        <p className="mt-1 text-sm opacity-70">
          Your data stays in your browser. Nothing is uploaded.
        </p>
        <button
          type="button"
          className="btn btn-primary mt-4"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          {busy ? 'Importing…' : 'Choose ZIP file'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {progress && (
        <div
          className="rounded-box border border-base-300 bg-base-100 p-4"
          role="status"
          aria-live="polite"
        >
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold">{importProgressLabel(progress)}</span>
            {progressPercent !== null && (
              <span className="tabular-nums opacity-70">{progressPercent}%</span>
            )}
          </div>
          <progress
            className="progress progress-primary w-full"
            value={progressPercent ?? undefined}
            max={100}
            aria-label="Import progress"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="btn btn-error"
              onClick={() => {
                // Signal the import to abort and update the UI immediately so
                // the user sees the import stopped even if extraction is still running.
                importAbortRef.current?.abort();
                setBusy(false);
                setProgress(null);
                setError('Import stopped');
                importAbortRef.current = null;
              }}
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div role="alert" className="alert alert-warning">
          <div>
            <p className="font-semibold">{warnings.length} file(s) had issues:</p>
            <ul className="list-inside list-disc text-sm">
              {warnings.slice(0, 5).map((w) => (
                <li key={w.file}>
                  {w.file}: {w.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function importProgressLabel(progress: ImportUiProgress): string {
  if (progress.phase === 'extracting') return 'Extracting ZIP...';
  if (progress.phase === 'storing') {
    const file = progress.file ? ` ${progress.file}` : '';
    const completed = formatProgressCount(progress.completed ?? 0);
    const total = formatProgressCount(progress.total ?? 0);
    return `Saving${file} (${completed}/${total} rows)`;
  }
  if (progress.phase === 'finalizing') return 'Finalizing import...';
  if (progress.phase === 'done') return 'Import complete.';
  return `Parsing ${progress.file ?? 'file'} (${progress.current ?? progress.completed ?? 0}/${progress.total ?? 0})`;
}

function importProgressPercent(progress: ImportUiProgress): number | null {
  if (progress.phase === 'done') return 100;
  if (progress.phase !== 'parsing' && progress.phase !== 'storing') return null;
  const total = progress.total ?? 0;
  if (total <= 0) return null;
  const completed =
    progress.completed ??
    (progress.phase === 'parsing' ? Math.max(0, (progress.current ?? 1) - 1) : total);
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

function formatProgressCount(count: number): string {
  return count.toLocaleString();
}
