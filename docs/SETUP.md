# Mise en place

Zoralia partage le projet Supabase de Popote (limite de 2 projets gratuits). Rien n'est modifié dans `public`.

## 1. Base de données (une fois)

1. Supabase → **SQL Editor** → coller `supabase/migrations/0001_init.sql` → **Run**.
2. Supabase → **Settings → API → Exposed schemas** : ajouter `zoralia`, enregistrer.
3. Supabase → **Authentication → URL Configuration → Redirect URLs** : ajouter
   `https://zoralia.pomponlabs.com` et `http://localhost:5173` (laisser le *Site URL* de Popote tel quel).

Le fournisseur Google est déjà configuré pour Popote : même client OAuth, rien à ajouter côté Google
(le callback est celui de Supabase). Un même compte Google ouvre Popote et Zoralia.

> Supprimer son compte dans Popote (`delete_account`) supprime aussi le foyer Zoralia du compte (cascade voulue).

## 2. Local

`cp .env.example .env.local`, renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (publishable), puis `npm run dev`.

## 3. Déploiement (GitHub Pages)

1. Créer le dépôt `zoralia`, pousser `main`.
2. Settings → Secrets and variables → Actions → **Variables** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Settings → Pages → Source : **GitHub Actions**. Domaine personnalisé : `zoralia.pomponlabs.com` (le fichier `public/CNAME` le fournit).
4. DNS : enregistrement `CNAME` `zoralia` → `<compte-github>.github.io`.
5. Cocher **Enforce HTTPS** une fois le certificat émis.

## 4. Tests

`npm test` (règles de jeu) et `npm run test:sql` (schéma, RLS, RPC ; nécessite Docker).
