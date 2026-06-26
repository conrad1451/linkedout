# scripts/

Maintenance scripts for this repo. These are **not** shipped with the app — they are tooling used to generate and refresh the anonymized fixtures under [`test-data/`](../test-data/).

## What's here

| File                                             | Purpose                                                                                                                                                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [anonymize.mjs](anonymize.mjs)                   | Main entry point. Reads a real LinkedIn data export, strips PII, and writes safe fixtures into `test-data/`.                                                                                                                                |
| [csv.mjs](csv.mjs)                               | Minimal RFC‑4180 CSV parser/writer used by the anonymizer. Preserves quoting and embedded newlines.                                                                                                                                         |
| [fake-pools.mjs](fake-pools.mjs)                 | Pools of fake names, headlines, summaries, messages, comments, etc. used to replace real content.                                                                                                                                           |
| `anonymize-owner.local.json`                     | Optional owner-alias config. **Git-ignored.** Keep your real names, slugs, emails, phone variants, domains, and location cleanup patterns here so they never land in the public repo.                                                       |
| [anonymize-mapping.json](anonymize-mapping.json) | Persisted real → fake mapping (slugs, names, emails, IPs, phones). **Git‑ignored.** Keep this file local; re‑using it across runs keeps anonymization stable so the same real person always maps to the same fake persona across all files. |

## When to use

You only need to run anything in this folder when:

- LinkedIn changes its data export schema (new columns, new files, renamed files).
- You want to refresh the fixtures with more / different rows.
- You're adding a new file type to support in the app and want a corresponding fixture.

For day‑to‑day development and tests, just use the existing [`test-data/`](../test-data/) — no script needs to run.

## Generating / refreshing fixtures

1. Request your own LinkedIn data export ("Complete archive") from <https://www.linkedin.com/mypreferences/d/download-my-data>.
2. Unzip it into the repo root as:

   ```text
   Complete_LinkedInDataExport_12-17-2025/
   ```

   (The folder name is hard‑coded in `anonymize.mjs`. Update the `SRC` constant if your export is named differently.)

3. Create `scripts/anonymize-owner.local.json` with your own aliases. Example:

   ```json
   {
     "nameKeys": ["first|last", "nickname|"],
     "slugs": ["your-linkedin-slug"],
     "emails": ["you@example.com"],
     "phones": ["+15555550123", "+1 555 555 0123"],
     "globalReplacements": [
       {
         "pattern": "yourdomain\\.com",
         "flags": "gi",
         "replacement": "joesmith.example.com"
       },
       {
         "pattern": "\\byour-city\\b",
         "flags": "gi",
         "replacement": "Springfield"
       }
     ]
   }
   ```

4. Run:

   ```sh
   node scripts/anonymize.mjs
   ```

5. Inspect the result in `test-data/` and commit only the fixtures (not the export, not the mapping file, not the owner-alias file — all are git‑ignored).

## What the anonymizer guarantees

- **No real PII** in `test-data/`: real names, emails, phone numbers, IP addresses, geo locations, profile slugs, message bodies, comment bodies, post bodies, and recommendation text are all replaced.
- **Consistency**: a given real person always maps to the same fake persona across every file (so message threads, reactions, comments, invitations, and connections still line up). This relies on `anonymize-mapping.json` being preserved between runs.
- **Schema fidelity**: file names, column headers, column order, quoting style, embedded newlines, and other CSV edge cases from the source export are preserved.
- **Volume cap**: large files (e.g. `messages.csv`) are capped at 100 rows — enough to populate the UI during development without bloating the repo.
- **Owner identity**: the export owner is rewritten to a fixed fake persona (see the `OWNER` constant in `anonymize.mjs`) so the UI has a stable "me". Keep the owner-alias file locally so those matches stay out of source control.

## Adding support for a new file

1. Add a per‑file handler in `anonymize.mjs` (look at `handleConnections`, `handleMessages`, `handleComments` for patterns).
2. Wire it into the `main()` dispatcher.
3. If a column contains free‑form human text (messages, comments, descriptions), replace it from a pool in `fake-pools.mjs` — **never** carry the original text through.
4. Re‑run the script and verify with:

   ```sh
   grep -riE "your-real-name|your-real-email|your-real-city" test-data/
   ```

   The output should be empty.
