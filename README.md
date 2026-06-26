# LinkedOut

Browse your LinkedIn data export locally in the browser. No server, no tracking — your data never leaves your machine.

**NOTE: this project is coded by LLMs. While the runtime is strictly sandboxed and it works offline, I think you should know. Read the [privacy statement](./PRIVACY.md)**

## What It Does

Read more [here](https://blog.alexewerlof.com/p/linkedout).

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

## Privacy

LinkedOut is a **local-only** application. Your LinkedIn export ZIP is processed entirely in your browser. No data is ever sent to any server, and there are no analytics or tracking of any kind.

## License

MIT
