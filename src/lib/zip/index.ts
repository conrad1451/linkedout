import { unzip, unzipSync, type Unzipped } from 'fflate';

export interface ExportFile {
  path: string;
  bytes: Uint8Array;
}

export async function extractExport(
  source: Blob | ArrayBuffer | Uint8Array,
): Promise<ExportFile[]> {
  let bytes: Uint8Array;
  try {
    bytes = await toBytes(source);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[zip] failed to convert source to bytes', e);
    throw e;
  }
  // Diagnostic: log size and magic bytes to help debug hangs
  try {
    // eslint-disable-next-line no-console
    console.info('[zip] bytes', { length: bytes.length, sig: Array.from(bytes.slice(0, 4)) });
  } catch {}

  const unzipped = await new Promise<Unzipped>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      // eslint-disable-next-line no-console
      console.warn('[zip] unzip callback not invoked within 5000ms — attempting sync fallback');
      try {
        const syncResult = unzipSync(bytes);
        settled = true;
        clearTimeout(timer);
        resolve(syncResult as Unzipped);
      } catch (syncErr) {
        // eslint-disable-next-line no-console
        console.error('[zip] sync unzip fallback failed', syncErr);
        settled = true;
        clearTimeout(timer);
        reject(syncErr);
      }
    }, 5000);

    try {
      unzip(bytes, (err, data) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err) reject(err);
        else resolve(data);
      });
    } catch (e) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // eslint-disable-next-line no-console
      console.error('[zip] unzip threw synchronously', e);
      reject(e);
    }
  });

  const files: ExportFile[] = [];
  for (const [path, data] of Object.entries(unzipped)) {
    if (path.endsWith('/')) continue;
    files.push({ path, bytes: data });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

export function decodeText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

async function toBytes(source: Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  const buf = await source.arrayBuffer();
  return new Uint8Array(buf);
}
