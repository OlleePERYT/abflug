#!/usr/bin/env bash
# Baut die eigenständige Seite für GitHub Pages in docs/: index.html bekommt den Dokumentkopf,
# den sonst das Claude-Artifact drumherum setzt, dazu Manifest, Service Worker und Icons,
# damit sich das Spiel als App installieren lässt und offline läuft. Aufruf: scripts/pages.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p docs/icons
version=$(cat index.html pwa/sw.js pwa/manifest.webmanifest | sha256sum | cut -c1-12)
{
  printf '<!doctype html>\n<html lang="de">\n<meta charset="utf-8">\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  printf '<meta name="theme-color" content="#1FA9C6">\n'
  printf '<meta name="description" content="Puzzle auf einer Karibikinsel: Schick die Flugzeuge ans Gate, damit alle Touristen in den Urlaub kommen.">\n'
  printf '<link rel="manifest" href="manifest.webmanifest">\n'
  printf '<link rel="icon" href="icons/icon-192.png">\n'
  printf '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
  printf '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  printf '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
  printf '<meta name="apple-mobile-web-app-title" content="Abflug!">\n'
  cat index.html
  printf '\n<script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");</script>\n'
} > docs/index.html
sed "s/__VERSION__/$version/" pwa/sw.js > docs/sw.js
cp pwa/manifest.webmanifest docs/
cp icons/icon-192.png icons/icon-512.png icons/apple-touch-icon.png docs/icons/
touch docs/.nojekyll
echo "docs/ gebaut, Version $version"
