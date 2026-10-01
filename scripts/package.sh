#!/usr/bin/env bash
# Build the Chrome Web Store zip (manifest.json at the zip root).
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(python3 -c "import json;print(json.load(open('src/manifest.json'))['version'])")
out="dist"
zip="$out/startup-tab-suspender-$version.zip"

mkdir -p "$out"
rm -f "$zip"
(cd src && zip -r -q "../$zip" . -x '.*' -x '*/.*')
echo "Built $zip"
