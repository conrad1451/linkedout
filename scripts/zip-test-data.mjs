#!/usr/bin/env node
// Bundles ./test-data into ./test-data.zip so devs can drop the same fixture
// into the app's import dropzone without re-zipping by hand.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'test-data');
const OUT = join(ROOT, 'test-data.zip');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const srcStat = await stat(SRC).catch(() => null);
  if (!srcStat || !srcStat.isDirectory()) {
    console.error(`test-data/ not found at ${SRC}`);
    process.exit(1);
  }

  const files = await walk(SRC);
  const entries = {};
  for (const file of files) {
    const rel = relative(SRC, file).split(sep).join('/');
    entries[rel] = new Uint8Array(await readFile(file));
  }

  const zipped = zipSync(entries);
  await writeFile(OUT, zipped);
  console.log(`Wrote ${OUT} (${files.length} files, ${zipped.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
