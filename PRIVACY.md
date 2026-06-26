# Privacy Policy for LinkedOut

**Last updated: June 11, 2026**

## No Data Collection

LinkedOut is a local-only tool for browsing your LinkedIn data export. **It does not collect, transmit, or share any data.** There is no server, no backend, no analytics, no tracking, no ads — nothing leaves your browser.

## How Your Data Is Handled

When you drag a LinkedIn export ZIP into LinkedOut, it is decompressed in memory, parsed, and stored in [IndexedDB](https://developer.mozilla.org/docs/Web/API/IndexedDB_API) — a browser database that lives entirely on your device. At no point is any data sent over the network. You can verify this by opening your browser's Network tab while using the app.

You can delete all stored data at any time via the app's built-in controls, your browser's site data settings, or by uninstalling the extension.

## Permissions

The Chrome extension declares **zero permissions**. Its manifest requests nothing. IndexedDB is a standard web API and does not require any Chrome extension permission. The extension cannot access your browsing history, tabs, websites, or any other browser data.

## Data Sharing

LinkedOut does not share, sell, rent, or disclose any data to anyone — there is no server to send data to and no third-party services integrated. The project has no monetization of any kind.

## Open Source

LinkedOut is fully open source. You can audit the entire codebase to independently verify every claim in this policy, or build the extension yourself from source.

## Contact

Questions? Open an issue on the project's GitHub repository.

---

**In short: your data is yours. It stays on your device. No one — including the developer of this extension — ever sees it.**
