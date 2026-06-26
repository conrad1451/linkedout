# LinkedOut

Browse your LinkedIn data export locally in the browser. No server, no tracking — your data never leaves your machine.

## What It Does

LinkedIn lets you [export your data](https://www.linkedin.com/help/linkedin/answer/a1339101), but the result is a ZIP full of CSV files — not exactly browsable. LinkedOut gives you a real UI on top of that export:

- Browse your posts, comments, messages, connections, and more
- Find old posts you might want to delete from your profile
- Spot content that performed well and repost it
- Get an overview of your overall LinkedIn activity
- Every record links directly to the corresponding LinkedIn page so you can take action

## How It Works

1. [Request your LinkedIn data export](https://www.linkedin.com/help/linkedin/answer/a1339101) (choose the "Fast file" CSV format)
2. Open LinkedOut, drag the ZIP onto the page
3. Everything is parsed and stored in IndexedDB inside your browser
4. **Your data never leaves your machine.** There is no server, no upload, no analytics.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, then drag your LinkedIn export ZIP (or `test-data.zip` from this repo) onto the drop zone.

## Available Scripts

| Command                 | Description                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| `npm run dev`           | Start the Vite dev server                                        |
| `npm run build`         | Production build into `dist/`                                    |
| `npm run preview`       | Preview the production build locally                             |
| `npm test`              | Run the test suite (Vitest)                                      |
| `npm run test:watch`    | Run tests in watch mode                                          |
| `npm run test:coverage` | Run tests with coverage report                                   |
| `npm run lint`          | Lint with ESLint                                                 |
| `npm run typecheck`     | TypeScript type checking                                         |
| `npm run format`        | Format with Prettier                                             |
| `npm run format:check`  | Check formatting without applying                                |
| `npm run test-data:zip` | Bundle `test-data/` into `test-data.zip` (for drag-drop testing) |
| `npm run pack`          | Build the Chrome extension into `dist-extension/`                |

## Chrome Extension

You can run LinkedOut as a Chrome extension for a more integrated experience:

```bash
npm run pack
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `dist-extension/` folder. Click the LinkedOut icon in your toolbar to open the app in a new tab.

## Tech Stack

| Layer    | Technology                     |
| -------- | ------------------------------ |
| Language | TypeScript                     |
| UI       | React 19 + React Router 7      |
| Styling  | Tailwind CSS 4 + daisyUI 5     |
| Build    | Vite                           |
| Storage  | IndexedDB (via `idb`)          |
| ZIP      | `fflate` (browser-safe, sync)  |
| Icons    | `lucide-react`                 |
| Testing  | Vitest + React Testing Library |

## Project Structure

```
src/
  app/           Providers, router, layout shell
  components/    Shared UI components
  features/      Feature folders (dashboard, profile, activity, messages, network,
                 import, raw) — each owns its routes, components, and helpers
  hooks/         Shared React hooks
  lib/           Pure, framework-free modules for CSV parsing, ZIP handling,
                 schema definitions, and IndexedDB storage
  platform/      Thin shims for web vs. Chrome extension targets
extension/       Chrome extension manifest and background service worker
test-data/       Anonymized canonical fixture export (committed, used for dev and tests)
scripts/         Utility scripts (anonymization, ZIP generation, CSV tooling)
```

## Privacy

LinkedOut is a **local-only** application. Your LinkedIn export ZIP is processed entirely in your browser. No data is ever sent to any server, and there are no analytics or tracking of any kind.

## License

MIT
