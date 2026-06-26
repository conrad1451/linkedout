#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Building the extension..."
npm run pack

# Extract raw name and version from the manifest
RAW_NAME=$(jq -r '.name' dist-extension/manifest.json)
VERSION=$(jq -r '.version' dist-extension/manifest.json)

# Sanitize the name for the filesystem (lowercase, replace spaces with hyphens)
SAFE_NAME=$(echo "$RAW_NAME" | tr '[:upper:]' '[:lower:]' | tr -s ' ' '-')

# Construct the final zip file name
ZIP_NAME="${SAFE_NAME}-${VERSION}.zip"

echo "Packaging '$RAW_NAME' as $ZIP_NAME..."

# Ensure clean slate
rm -f "$ZIP_NAME"

# Package from within the dist folder
(cd dist-extension && 7z a -tzip "../$ZIP_NAME" *)

echo "Done! $ZIP_NAME is ready for the Web Store."