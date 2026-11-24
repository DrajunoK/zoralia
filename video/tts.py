"""Voix off : une phrase par scène, voix française Piper (fr_FR-siwis-medium, CC BY 4.0).
Usage : PIPER_LIB=… VOICE_DIR=… python3 tts.py <dossier de sortie>   → scene-<id>.wav et timeline.json (durées)."""
import json, os, sys, wave
sys.path.insert(0, os.environ['PIPER_LIB'])
import piper
from piper import SynthesisConfig

out = sys.argv[1]; os.makedirs(out, exist_ok=True)
script = json.load(open(os.path.join(os.path.dirname(__file__), 'script.json')))
d = os.environ['VOICE_DIR']
voice = piper.PiperVoice.load(f'{d}/{script["voice"]}.onnx', config_path=f'{d}/{script["voice"]}.onnx.json')
cfg = SynthesisConfig(length_scale=script['length_scale'])
t = 0.6  # petit silence avant la première phrase
timeline = []
for sc in script['scenes']:
    path = os.path.join(out, f'scene-{sc["id"]}.wav')
    with wave.open(path, 'wb') as w:
        voice.synthesize_wav(sc['text'], w, syn_config=cfg)
    with wave.open(path, 'rb') as w:
        dur = w.getnframes() / w.getframerate()
    # repère de chaque mot-clé : la voix avance à peu près au rythme des caractères, on place l'image un souffle avant le mot
    n = len(sc['text'])
    cues = { k: round(max(0.0, dur * sc['text'].index(frag) / n - 0.12), 3) for k, frag in sc.get('cues', {}).items() }
    timeline.append({ 'id': sc['id'], 'start': round(t, 3), 'voice': round(dur, 3), 'end': round(t + dur + sc['gap'], 3), 'text': sc['text'], 'cues': cues })
    t += dur + sc['gap']
json.dump({ 'total': round(t, 3), 'scenes': timeline }, open(os.path.join(out, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
print('durée totale', round(t, 1), 's'); [print(f"  {s['id']:9} {s['start']:6.1f} → {s['end']:6.1f}  (voix {s['voice']:.1f}s)") for s in timeline]
