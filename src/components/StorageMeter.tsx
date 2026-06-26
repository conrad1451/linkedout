import { HardDrive } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getStorageEstimate, type StorageEstimate } from '../platform/storage';

export function StorageMeter() {
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getStorageEstimate().then((next) => {
      if (cancelled) return;
      setEstimate(next);
      setSupported(next !== null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!supported) return null;

  const usage = estimate?.usage ?? 0;
  const quota = estimate?.quota ?? 0;
  const percent = quota > 0 ? Math.min(100, Math.round((usage / quota) * 100)) : 0;

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <HardDrive className="h-4 w-4 text-primary" />
          Browser storage
        </div>
        <span className="text-sm opacity-70">
          {formatBytes(usage)} / {quota > 0 ? formatBytes(quota) : 'unknown'}
        </span>
      </div>
      <progress className="progress progress-primary w-full" value={percent} max="100" />
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
