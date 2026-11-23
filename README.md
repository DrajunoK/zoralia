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

## Scripts

| Commande | Rôle |
|---|---|
| `npm test` | tests des règles de jeu (Vitest) |
| `npm run test:sql` | migrations + tests d'acceptation SQL/RLS dans un Postgres jetable (Docker) |
| `npm run build` | typecheck + build de production dans `dist/` |

## Architecture en bref

- **Les pépites ne se modifient que côté serveur.** Le navigateur n'écrit jamais dans `points_transactions` : tout passe par des RPC `security definer` (`claim_mission`, `approve_mission`, `approve_reward`, `contribute_to_treasure`, `roll_dice`, `parent_adjust_points`…) qui vérifient l'utilisateur, le foyer, l'état et le solde.
- **Projet Supabase partagé avec Popote** : tout Zoralia vit dans le schéma `zoralia` ; le schéma `public` (Popote) n'est jamais touché. Les comptes Google (`auth.users`) sont communs.
- **Un seul compte : le parent.** Les enfants sont des profils de jeu sur l'appareil familial (pas une frontière de sécurité).
- **Univers = design tokens** (`src/lib/themes.ts`) ; règles et données sont partagées.
- Carte : `min(50, floor(pépites gagnées cumulées / 5))`, indépendante du solde.
