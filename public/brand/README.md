# LinkedOut Brand Assets

The repo keeps the checked-in app branding intentionally small:

- `/out-logo.svg` is the canonical source artwork for the app mark.
- `/out-logo.png` is the high-resolution PNG export for surfaces that require raster icons.
- `/out-logo-32.png` and `/out-logo-16.png` are the favicon-sized PNG exports.
- `linkedin-default-profile-cover.svg` is the default profile cover artwork used on the profile page.

The app serves those root-level logo files directly for the favicon, touch icon, and web manifest.

If another surface later needs additional raster sizes, generate them from `/out-logo.svg` on demand instead of committing a separate icon set directory.

For store listings or extension manifests, prefer generating only the exact PNG sizes required for that target at release time.
