#!/usr/bin/env bash
# Refait la vidéo « Comment ça marche ? » de A à Z : voix off → dessin animé image par image → mixage → mp4.
#
# Prérequis (rien de tout ça n'est dans le dépôt) :
#   - ffmpeg, un Chromium, node avec `playwright-core` installé dans ./node_modules
#   - python3 avec `piper-tts` et `numpy` installés dans un dossier (PIPER_LIB)
#   - la voix française Piper « fr_FR-siwis-medium » (.onnx + .onnx.json) dans VOICE_DIR
#     (https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models → vits-piper-fr_FR-siwis-medium, CC BY 4.0)
#
# Usage : PIPER_LIB=… VOICE_DIR=… ./build.sh [dossier de travail]
set -euo pipefail
cd "$(dirname "$0")"
WORK="${1:-/tmp/zoralia-video}"; OUT=../public/video
mkdir -p "$WORK/audio" "$OUT"

python3 tts.py "$WORK/audio"                                     # voix off + timeline.json (durées, repères)
node render.mjs "$WORK/audio/timeline.json" "$WORK/silent.mp4" "$WORK/sfx.json" 24
python3 mix.py "$WORK/audio" "$WORK/sfx.json" "$WORK/mix.wav"    # musique + bruitages + voix
ffmpeg -y -loglevel error -i "$WORK/silent.mp4" -i "$WORK/mix.wav" \
  -filter_complex "[1:a]loudnorm=I=-16:TP=-1.5:LRA=9,aresample=44100[a]" -map 0:v -map "[a]" \
  -c:v copy -c:a aac -b:a 112k -ac 2 -shortest -movflags +faststart "$OUT/zoralia-aventure.mp4"
ffmpeg -y -loglevel error -ss 2.9 -i "$OUT/zoralia-aventure.mp4" -frames:v 1 -vf scale=960:-1 -q:v 4 "$OUT/zoralia-aventure.jpg"

python3 - "$WORK/audio/timeline.json" "$OUT/zoralia-aventure.fr.vtt" <<'PY'                 # sous-titres
import json, sys
t = json.load(open(sys.argv[1]))
ts = lambda x: f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{x % 60:06.3f}"
cues = [f"{i}\n{ts(s['start'])} --> {ts(s['start'] + s['voice'] + 0.2)}\n{s['text']}\n" for i, s in enumerate(t['scenes'], 1)]
open(sys.argv[2], 'w').write('WEBVTT\n\n' + '\n'.join(cues))
PY
echo "→ $OUT/zoralia-aventure.mp4"
