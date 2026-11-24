# Vidéo « Comment ça marche ? »

Dessin animé de 59 secondes (renard Roux, univers aventurier) avec voix off française, musique et bruitages, joué dans l'appli
(`src/ui/IntroVideo.tsx`) depuis la page des profils et l'accueil de chaque enfant. Résultat : `public/video/zoralia-aventure.mp4`
(+ sous-titres `.fr.vtt` et affiche `.jpg`).

| Fichier | Rôle |
|---|---|
| `script.json` | le texte de la voix off, scène par scène, et les mots-clés qui déclenchent les animations |
| `tts.py` | voix de synthèse (Piper, `fr_FR-siwis-medium`) ; mesure la durée de chaque phrase → `timeline.json` |
| `scene.html` | le dessin animé : une page dont chaque image ne dépend que de l'instant `t` (`window.seek(t)`) |
| `render.mjs` | rend la scène image par image avec Chromium et encode en mp4 |
| `mix.py` | musique (do majeur, marimba), bruitages et voix, tous synthétisés ; la musique baisse quand la voix parle |
| `build.sh` | enchaîne tout (voir les prérequis dans le script) |

Pour changer le texte : modifier `script.json`, relancer `build.sh` ; les images se recalent seules sur la nouvelle durée de la voix.

## Crédits et licences

- Voix : modèle Piper `fr_FR-siwis-medium` (jeu de données SIWIS, CC BY 4.0). La mention figure sous le lecteur dans l'appli.
- Musique, bruitages, personnages et décors : créés pour Zoralia, aucune ressource tierce.
- La voix est une synthèse : on entend qu'elle n'est pas humaine. Pour une vraie voix, remplacer les `scene-*.wav` par des enregistrements
  (mêmes noms) et relancer `render.mjs` + `mix.py` avec la nouvelle `timeline.json`.
