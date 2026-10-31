#!/usr/bin/env bash
# Baut die eigenständige Seite für GitHub Pages: index.html bekommt den Dokumentkopf,
# den sonst das Claude-Artifact drumherum setzt. Aufruf: scripts/pages.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p docs
{
  printf '<!doctype html>\n<html lang="de">\n<meta charset="utf-8">\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  cat index.html
} > docs/index.html
touch docs/.nojekyll
echo "docs/index.html gebaut"
