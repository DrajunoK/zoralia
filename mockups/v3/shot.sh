#!/usr/bin/env bash
# Usage : mockups/v2/shot.sh <ecran> <largeur> <hauteur> <sortie.png> [univers]
d="$(cd "$(dirname "$0")" && pwd)"
chromium --headless=new --no-sandbox --disable-gpu --disable-dbus --hide-scrollbars --virtual-time-budget=2500 \
  --screenshot="$4" --window-size="$2,$3" "file://$d/index.html?shot&theme=${5:-aventuriers}&skin=${6:-arcade}#$1" >/dev/null 2>&1
