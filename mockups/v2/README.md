# Zoralia — maquette v2 « jeu »

Ouvrir `index.html` dans un navigateur (téléphone : largeur 390 px ; tablette/desktop : jusqu'à 920 px). La barre du haut change d'univers en direct ; `?theme=pirates` choisit l'univers au chargement, `#carte`, `#boutique`, `#tresor`, `#de`, `#badges`, `#parent` ouvrent un écran.

## Direction

Inspirée de Botz : aplats vifs, gros contours encre, boutons 3D qui s'enfoncent, polices **Bungee** (titres, chiffres) et **Fredoka** (texte), décor flottant par univers.

- **Boutons et tuiles** : ombre pleine, appui = le bouton s'enfonce. Cible tactile ≥ 48 px.
- **Pépites** : vraies pièces dessinées en CSS (la même dans les 5 univers), compteur qui rebondit à chaque gain.
- **Barre de progression** rayée animée ; **carte en serpentin** par territoire avec le héros qui saute sur l'étape actuelle.
- **Récompenses visuelles** : confettis et pièces qui volent vers le compteur quand on termine une mission, qu'on donne au coffre ou qu'on lance le dé ; coffre qui tremble ; médailles qui brillent.
- **Univers = tokens** (`[data-theme]` dans `game.css`) : fond, couleur d'action, couleur de bandeau, décor (emojis flottants), libellés de territoires. Aucun composant ne change.
- **Accessibilité** : `prefers-reduced-motion` coupe toutes les animations ; contrastes encre sur panneaux clairs ; libellés sous chaque icône.

## Écrans

Profils · Accueil · Missions (du jour / héroïques / surprises) · Carte · Boutique · Trésor · Dé du destin · Badges · Espace parent (file de validation).

## Pour l'appli

Les tokens et composants de `game.css` se portent tels quels dans `src/index.css` ; les polices viennent de `botz-site` (`fonts/`). Les illustrations restent des emojis : de vrais assets par univers sont l'étape suivante.

`shot.sh <écran> <largeur> <hauteur> <sortie.png> [univers]` fait une capture avec Chromium (animations coupées).
