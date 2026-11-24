# Zoralia

Application web familiale : les enfants réalisent des missions, gagnent des pépites, avancent sur une carte de 50 cases, échangent leurs pépites contre des récompenses et remplissent ensemble un trésor commun. Le parent valide tout.

- Spécifications : [`ZORALIA_SPEC.md`](ZORALIA_SPEC.md) · maquettes : [`mockups/`](mockups/)
- Stack : React + Vite + TypeScript (SPA statique) · Supabase (Auth Google, PostgreSQL, RLS, RPC)
- Production : https://zoralia.pomponlabs.com (GitHub Pages)

## Démarrer

```bash
npm install
cp .env.example .env.local   # URL Supabase + clé publishable (jamais la service_role)
npm run dev                  # http://localhost:5173
```

Mise en place de Supabase, de Google et du déploiement : [`docs/SETUP.md`](docs/SETUP.md).

## Codes d'accès

Chaque enfant peut avoir un code à 4 chiffres (espace parent → Enfants → Modifier), et l'espace parent a le sien (0000 par défaut, à changer dans Réglages). C'est un verrou contre les petites mains, pas une sécurité forte : la connexion Google du parent reste la vraie authentification. Les codes sont hachés côté base et jamais relisibles.

## PWA

L'appli est installable (manifeste + service worker `public/sw.js` qui ne met en cache que l'interface, jamais les données). Bouton « Installer l'appli » sur la connexion et les profils ; sur iPhone, mode d'emploi (Partager → Sur l'écran d'accueil). Le service worker n'est actif que dans la version déployée (pas en `npm run dev`).

## Scripts

| Commande | Rôle |
|---|---|
| `npm test` | tests des règles de jeu (Vitest) |
| `npm run test:sql` | migrations + tests d'acceptation SQL/RLS dans un Postgres jetable (Docker) |
| `npm run dev:mock` | l'appli avec de fausses données (sans Supabase) pour travailler le design : `?theme=pirates` change d'univers, `/profils`, `/enfant/00000000-0000-4000-8000-000000000011`, `/parent` |
| `npm run build` | typecheck + build de production dans `dist/` |

## Architecture en bref

- **Les pépites ne se modifient que côté serveur.** Le navigateur n'écrit jamais dans `points_transactions` : tout passe par des RPC `security definer` (`claim_mission`, `approve_mission`, `approve_reward`, `contribute_to_treasure`, `roll_dice`, `parent_adjust_points`…) qui vérifient l'utilisateur, le foyer, l'état et le solde.
- **Projet Supabase partagé avec Popote** : tout Zoralia vit dans le schéma `zoralia` ; le schéma `public` (Popote) n'est jamais touché. Les comptes Google (`auth.users`) sont communs.
- **Un seul compte : le parent.** Les enfants sont des profils de jeu sur l'appareil familial (pas une frontière de sécurité).
- **Univers = design tokens** (`src/lib/themes.ts`) ; règles et données sont partagées.
- **Deux monnaies** : les pas 👣 (missions) font avancer la carte et ne se dépensent jamais ; les pépites 🪙 viennent des coffres de la carte (et du dé) et se dépensent en boutique ou dans le trésor. Carte : une case par pas, 500 cases, 20 coffres (1er à 10 pas, puis un tous les 25 pas). Détail : `supabase/migrations/0005_pas_et_coffres.sql`.
