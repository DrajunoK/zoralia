# Zoralia — maquette v3 : 5 styles à comparer

- `compare.html` : les 5 styles côte à côte (5 écrans chacun, cliquables). Menu pour changer d'univers et la taille ; « Figer » coupe les animations (page lourde : 25 écrans animés).
- `index.html?skin=douceur&theme=pirates#carte` : un style, un univers, un écran. Barres du haut pour changer en direct.
- `skins.css` : les 5 styles. Même HTML et mêmes données que la v2 ; chaque style ne fait que surcharger `game.css`.

| Style | Couleurs | Animation | Ambiance |
|---|---|---|---|
| Arcade | vives, contours épais | ●●●●○ | boutons 3D, façon Botz |
| Douceur | pastel | ●○○○○ | ombres douces, calme |
| Candy | saturées, arc-en-ciel | ●●●●● | reflets, tout bouge |
| Carnet | papier, aplats chauds | ●●○○○ | stickers, quadrillage |
| Nuit | néons sur fond sombre | ●●●○○ | verre dépoli, aurore |

Les univers (aventuriers, princesses, pirates, espace, dinosaures) fonctionnent avec chaque style.

## Modèle de jeu montré par cette maquette (deux monnaies)

- 👣 **Pas** : gagnés en validant des missions, font avancer la carte (100 étapes de 5 pas), ne se dépensent jamais.
- 🧰 **Coffres** sur la carte (1er à 10 pas, puis un tous les 25 pas ; 5, 8, 10, 15, 20 pépites selon le territoire) : seule source automatique de pépites.
- 🪙 **Pépites** : boutique et trésor commun. Dépenser ne fait jamais reculer la carte.
- Dans l'espace parent, « Valider » une mission donne +1 pas et peut ouvrir un coffre (animation + pépites).
