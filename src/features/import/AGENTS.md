# Import Feature Notes

This file documents how the LinkedIn ZIP import works today so future agents can work on this feature without re-deriving the pipeline from scratch.

## Scope

- UI entrypoint: `src/features/import/ImportDropzone.tsx`
- Import orchestration: `src/features/import/importExport.ts`
- ZIP extraction: `src/lib/zip/index.ts`
- CSV parsing: `src/lib/csv/`
- Schema resolution: `src/lib/schema/index.ts`
- Storage and query layer: `src/lib/store/index.ts`
- Shared meta IndexedDB schema: `src/lib/store/meta.ts`

## High-level flow

1. The user selects or drops a `.zip` file in `ImportDropzone`.
2. `handleFile()` calls `importExportZip(file, { label, onProgress, signal })`.
3. `importExportZip()` emits the `extracting` progress phase, unzips the archive, and filters to `.csv` files only.
4. Each CSV path is matched against the dataset schema registry with `findSchemaForFile()` / `resolveSchemaForFile()`.
5. The CSV bytes are decoded and parsed into `Array<Record<string, string>>`.
6. The parsed datasets are handed to `createImport()` in `src/lib/store/index.ts`.
7. `createImport()` opens a per-import IndexedDB database, normalizes each row, writes the rows into dataset-specific object stores, and finally saves import metadata into the shared meta DB.
8. The dropzone activates the new import, refreshes the imports list, and surfaces any warnings.

## Progress model

The UI progress phases are:

- `extracting`: ZIP bytes are being unpacked.
- `parsing`: CSV files are being decoded and parsed into row objects.
- `storing`: parsed rows are being normalized and written to IndexedDB.
- `done`: import finished.
- `finalizing`: UI-only phase after storage completes while the app activates and refreshes the import list.

Notes:

- Parsing progress is file-based.
- Storing progress is row-based across all datasets.
- The dropzone supports cancellation via `AbortController`.
- Aborts and write failures should clean up partial imports via `cleanupFailedImport()`.

## Schema resolution and dataset IDs

Schema lookup is intentionally tolerant:

- Exact path match
- Basename match
- Case-insensitive match
- Trailing numeric suffix stripping, for files like `Comments_91029461.csv`
- Fallback raw schema for unknown CSVs

Dataset IDs are generated per import in `uniqueId()`:

- First recognized instance of a schema usually keeps the schema ID as-is.
- Repeated datasets get suffixed IDs like `<schema-id>-2`.
- Unknown CSVs use fallback `raw-*` schema IDs.

This means callers should not assume `datasetId === schemaId` for all imported datasets.

## What gets stored

The importer stores rows mostly in raw form, but not completely unchanged.

For each dataset row, `normalizeDatasetRow()` preserves the original CSV columns and adds internal fields:

- `__row`: original row order within the dataset
- `__date`: primary normalized timestamp when one can be inferred
- `__dateField`: which field produced `__date`
- `__datePrecision`: precision returned by temporal parsing
- `__dates`: normalized temporal values for detected date-like fields
- `__searchTokens`: tokenized search terms built from row text

The import metadata record stores:

- import ID, label, created time
- file count and total row count
- per-dataset metadata
- inferred LinkedIn profile info when available

The system does not currently precompute feature-specific view models or aggregates for pages like activity, messages, or profile. The main import-time optimizations are generic date normalization and generic search token indexing.

## IndexedDB layout

There are two storage layers:

### Shared meta DB

- Database name: `linkedout-meta`
- Defined in `src/lib/store/meta.ts`
- Stores:
  - `imports`: import metadata records
  - `settings`: app-level settings such as active import and donation settings

### Per-import DB

- Database name: `linkedout-import-<importId>`
- One object store per dataset: `dataset:<datasetId>`
- Row key path: `__row`
- Indexes:
  - `by-date` on `__date`
  - `by-search-token` on `__searchTokens` as a multi-entry index

## Performance characteristics

Large imports are slow because all work happens client-side in the browser.

The main costs are:

- ZIP extraction
- parsing every CSV into row objects in memory
- per-row temporal normalization
- per-row search token generation
- IndexedDB write overhead for many `put()` calls

Important implementation details:

- `createImport()` writes in chunks, default chunk size `500` rows.
- Within a chunk, `store.put()` calls are intentionally fired without awaiting each one individually.
- The code waits on `tx.done` once per chunk, which is materially faster than awaiting every write.
- Progress updates are yielded back to the UI with `setTimeout(..., 0)` in `reportProgress()` so the page can repaint during long imports.

## Special cases

- `Connections.csv` may contain a LinkedIn explanatory preamble before the real header. `parseOptionsForSchema()` handles this by providing a custom header matcher.
- Unknown CSVs are still imported as raw datasets and surfaced as warnings.
- Non-CSV files in the ZIP are ignored.
- `Services Marketplace/Providers.csv` is now a first-class known dataset and should not warn.

## Known failure mode that was fixed

The shared meta DB used to be opened from two different modules with the same DB name and version but different upgrade logic:

- `src/lib/store/index.ts`
- `src/lib/store/donation.ts`

That could create `linkedout-meta` with only the `settings` store and no `imports` store, which then broke `listImports()` with:

`Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.`

The fix was to centralize the shared schema in `src/lib/store/meta.ts` and bump the DB version so existing browsers self-heal on reload.

If a future change adds another consumer of `linkedout-meta`, it must use `openMetaDb()` from `src/lib/store/meta.ts` rather than opening the DB independently.

## Guidance for future changes

- If you change import-time normalization, check both write performance and query behavior.
- If you add new LinkedIn export files, update `src/lib/schema/index.ts` and import tests together.
- If you change progress semantics, keep `ImportDropzone` and tests aligned.
- If you touch `linkedout-meta`, do not duplicate schema ownership across modules.
- If you optimize import speed, start by measuring row normalization and IndexedDB write cost before redesigning the UI layer.

## Useful tests

- `src/features/import/importExport.test.ts`
- `src/lib/schema/index.test.ts`
- `src/lib/store/index.test.ts`

These cover the import pipeline, schema matching, and IndexedDB behavior, including the shared meta DB upgrade regression.
