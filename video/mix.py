"""Mixage : voix off (une phrase par scène) + musique originale + bruitages, tous synthétisés ici (aucun son sous licence).
Usage : PIPER_LIB=<dossier avec numpy> python3 mix.py <dossier audio> <sfx.json> <sortie.wav>"""
import json, os, subprocess, sys, wave
sys.path.insert(0, os.environ['PIPER_LIB'])
import numpy as np

SR = 44100
audio_dir, sfx_path, out = sys.argv[1:4]
timeline = json.load(open(os.path.join(audio_dir, 'timeline.json')))
total = timeline['total'] + 0.6
N = int(total * SR)
rng = np.random.default_rng(7)

def tt(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.005, decay=6.0):
    t = tt(d); return np.minimum(1, t / a) * np.exp(-decay * t)
def mid(n): return 440.0 * 2 ** ((n - 69) / 12)

def marimba(f, d=0.6, amp=1.0):
    t = tt(d); e = env(d, 0.004, 7.0)
    return amp * e * (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-14 * t) + 0.15 * np.sin(2 * np.pi * 2 * f * t))
def pluck_bass(f, d=0.5, amp=1.0):
    t = tt(d); return amp * env(d, 0.01, 5.0) * (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t))
def lowpass_sweep(x, f0, f1):
    y = np.zeros_like(x); a = 0.0; n = len(x)
    for i in range(n):
        fc = f0 + (f1 - f0) * i / n; k = 1 - np.exp(-2 * np.pi * fc / SR); a += k * (x[i] - a); y[i] = a
    return y

def s_pop():
    d = 0.12; t = tt(d); f = 520 + 520 * (t / d); return 0.8 * env(d, 0.002, 28) * np.sin(2 * np.pi * np.cumsum(f) / SR)
def s_click():
    d = 0.06; t = tt(d); return 0.7 * env(d, 0.001, 70) * (rng.standard_normal(len(t)) * 0.6 + np.sin(2 * np.pi * 1400 * t))
def s_ding():
    d = 0.9; t = tt(d); return 0.6 * env(d, 0.003, 4.5) * (np.sin(2 * np.pi * 1318.5 * t) + 0.6 * np.sin(2 * np.pi * 1975.5 * t) + 0.2 * np.sin(2 * np.pi * 2637 * t))
def s_whoosh():
    d = 0.5; n = rng.standard_normal(int(d * SR)); y = lowpass_sweep(n, 300, 3500)
    t = tt(d); return 0.9 * np.sin(np.pi * t / d) ** 2 * y / (np.max(np.abs(y)) + 1e-9) * 0.7
def s_tada():
    parts = []; base = 60
    for i, n in enumerate([base, base + 4, base + 7, base + 12]): parts.append((i * 0.075, marimba(mid(n + 12), 0.9, 0.7)))
    chord = sum(marimba(mid(n + 12), 1.2, 0.4) for n in (base, base + 4, base + 7))
    parts.append((0.32, chord)); L = int(1.6 * SR); y = np.zeros(L)
    for s, w in parts: i = int(s * SR); y[i:i + len(w)] += w[: L - i]
    return 0.8 * y
def s_coin():
    d = 0.35; t = tt(d); e = env(d, 0.002, 10)
    f = np.where(t < 0.07, 1568.0, 2093.0); return 0.55 * e * np.sin(2 * np.pi * np.cumsum(f) / SR)
def s_step():
    d = 0.09; t = tt(d); f = 320 - 140 * (t / d); return 0.7 * env(d, 0.002, 38) * np.sin(2 * np.pi * np.cumsum(f) / SR)
def s_creak():
    d = 0.55; t = tt(d); f = 150 + 90 * (t / d) + 12 * np.sin(2 * np.pi * 22 * t)
    return 0.45 * np.sin(np.pi * t / d) * (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sign(np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)) * 0.3)
SFX = dict(pop=s_pop, click=s_click, ding=s_ding, whoosh=s_whoosh, tada=s_tada, coin=s_coin, step=s_step, creak=s_creak)
CACHE = {}

mix = np.zeros(N)

# ── musique : do majeur, 108 pulsations, accords do – la m – fa – sol, arpèges de marimba et basse douce ──
BPM = 108; beat = 60 / BPM; chords = [(60, [60, 64, 67]), (57, [57, 60, 64]), (53, [53, 57, 60]), (55, [55, 59, 62])]
motif = [0, 1, 2, 1, 2, 1, 0, 1]
music = np.zeros(N)
nb = int(total / beat) + 2
for b in range(nb):
    root, ch = chords[(b // 4) % 4]
    t0 = b * beat
    if b % 4 in (0, 2): w = pluck_bass(mid(root - 12), beat * 1.8, 0.9); i = int(t0 * SR); music[i:i + len(w)] += w[: max(0, N - i)] if i < N else 0
    for h in range(2):      # croches
        note = ch[motif[(b * 2 + h) % len(motif)]] + (12 if (b // 8) % 2 else 0)
        w = marimba(mid(note + 12), beat * 1.2, 0.55); i = int((t0 + h * beat / 2) * SR)
        if i < N: music[i:i + len(w)] += w[: N - i]
    if b % 4 == 3:          # petite fioriture de fin de mesure
        w = marimba(mid(ch[2] + 24), beat, 0.35); i = int((t0 + beat * .75) * SR)
        if i < N: music[i:i + len(w)] += w[: N - i]
music /= np.max(np.abs(music)) + 1e-9
mix += 0.11 * music

# ── bruitages ──
for ev in json.load(open(sfx_path)):
    f = ev['type']
    if f not in CACHE: CACHE[f] = SFX[f]()
    w = CACHE[f]; i = int(ev['t'] * SR)
    if i < N: mix[i:i + len(w)] += 0.30 * w[: N - i]

# ── voix off : ré-échantillonnée à 44,1 kHz par ffmpeg ──
voice = np.zeros(N)
for sc in timeline['scenes']:
    src = os.path.join(audio_dir, f'scene-{sc["id"]}.wav'); tmp = src.replace('.wav', '.44k.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-ar', str(SR), '-ac', '1', tmp], check=True)
    with wave.open(tmp, 'rb') as w: x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    i = int(sc['start'] * SR); voice[i:i + len(x)] += x[: N - i]
voice /= max(np.max(np.abs(voice)), 1e-9)
# la musique et les bruitages baissent doucement quand la voix parle
level = np.convolve(np.abs(voice), np.ones(int(0.15 * SR)) / int(0.15 * SR), mode='same')
duck = 1 - 0.45 * np.clip(level / 0.08, 0, 1)
mix = mix * duck + 0.95 * voice

# ── finition : fondu d'entrée / sortie, limiteur doux, niveau ──
fade_in = np.minimum(1, np.arange(N) / (0.25 * SR)); fade_out = np.minimum(1, (N - np.arange(N)) / (1.0 * SR))
mix *= fade_in * fade_out
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= 0.89 / (np.max(np.abs(mix)) + 1e-9)
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
print('mixage', f'{N / SR:.1f}s', 'pic', round(float(np.max(np.abs(mix))), 2))
