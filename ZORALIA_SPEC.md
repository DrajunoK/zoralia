# Zoralia — Spécifications produit & techniques
Version 0.1 — cahier des charges MVP pour développement avec agents  
URL de test cible : https://zoralia.pomponlabs.com/

## 1. Vision
Zoralia est une application web familiale qui transforme les routines, les efforts et les bons comportements en aventures. Les enfants réalisent des missions, gagnent des pépites, progressent sur une carte, débloquent des badges et échangent leurs pépites contre des récompenses. Un trésor commun encourage la coopération familiale.

La marque est indépendante des thèmes : le moteur de jeu reste identique, seuls les textes de territoire, illustrations, couleurs, textures et icônes changent.

Principes : expérience enfant très visuelle ; parent maître des règles ; progression persistante ; valorisation positive ; interface adaptée à une tablette familiale.

## 2. Utilisateurs
- Parent : compte authentifié Google, administrateur du foyer.
- Enfant : profil de jeu sans email ni mot de passe au MVP.
- Foyer : espace privé contenant plusieurs enfants, missions, boutique et trésor commun.

Hypothèse MVP : seul le parent s'authentifie. Le mode enfant est un sélecteur de profil sur un appareil familial ; il ne constitue pas une frontière de sécurité indépendante.

## 3. MVP
1. Connexion parent via Google (Supabase Auth).
2. Création du foyer et de plusieurs profils enfants.
3. Choix d'un univers visuel.
4. Missions quotidiennes, héroïques et surprises.
5. Déclaration de réalisation par l'enfant, validation par le parent.
6. Portefeuille de pépites et journal immuable des transactions.
7. Carte de progression de 50 cases / 5 territoires.
8. Boutique de récompenses et demandes d'échange.
9. Trésor commun familial.
10. Dé du destin.
11. Badges et niveaux.
12. Dashboard parent et écrans enfant.
13. Responsive mobile/tablette/desktop, priorité tablette.
14. Supabase PostgreSQL, Auth, Storage, RLS.

Hors MVP : paiements, abonnements, réseau social, classement public, notifications push, app native, génération IA des missions.

## 4. Référence gameplay : PDF « La Guilde des Aventuriers – Kit imprimable A3 »
Le kit fourni (une page) contient une carte, les règles, les quêtes, la boutique, deux fiches aventurier, le dé du destin, le trésor commun, les badges et des pépites à découper.

### Carte
50 cases en cinq territoires :
1. La Forêt des Premiers Pas — 0 à 29 pépites.
2. La Rivière des Découvertes — 30 à 79 pépites.
3. Le Château du Foyer — 80 à 149 pépites.
4. Les Montagnes des Héros — 150 à 249 pépites.
5. Le Sommet des Légendes — 250 pépites et plus.

Règle : 1 case parcourue toutes les 5 pépites gagnées au total, même si les pépites ont ensuite été dépensées. Calcul conseillé : `map_step = min(50, floor(lifetime_earned_points / 5))`. Le cumul de gains est monotone et indépendant du solde.

### Quêtes
- Quotidiennes : 1 pépite. Exemples : mettre la table, ranger sa chambre, se préparer sans râler, ranger ses affaires.
- Héroïques : 3 à 5 pépites. Exemples : aider sans qu'on le demande, gérer une dispute calmement, gros effort à l'école ou à l'entraînement, s'occuper de ses affaires.
- Pépite surprise : 1 à 3 pépites pour un bon geste spontané.

Le parent peut créer, modifier, désactiver et réutiliser les missions ; configurer titre, description, type, valeur, enfant(s), récurrence, fenêtre de disponibilité et validation requise.

### Boutique — exemples initiaux modifiables
- 5 pépites : choisir le film du vendredi ; se coucher 15 minutes plus tard.
- 10 pépites : choisir le dessert ; choisir le jeu en famille.
- 15 pépites : sortie choisie (piscine, crêpes…) ; inviter un copain/une copine.
- 25 pépites : activité spéciale avec papa ou maman ; petit cadeau.
- 40 pépites et plus : jouet/activité spéciale ; journée « c'est moi qui décide ».

### Badges
Le kit montre cinq niveaux : Petit aventurier, Explorateur, Gardien de la maison, Héros confirmé, Maître des missions. Les seuils précis ne sont pas définis : les rendre configurables.

### Dé du destin
Le kit propose un lancer une fois par semaine ou après 5 quêtes. Faces : x2 pépites ; +1 pépite ; carte joker (ex. 15 minutes de dessin / choisir le dessert) ; petite surprise au choix du parent. Tirage et enregistrement côté serveur.

### Trésor commun
Les enfants contribuent ensemble à un coffre ; lorsqu'il est plein, toute la famille gagne une grosse récompense. Prévoir objectif, contributions, jauge, récompense et statuts. Recommandation : contributions déduites du solde enfant et enregistrées dans le ledger.

Les effets exacts des cases spéciales (coffre, pont, frontière) ne sont pas spécifiés dans le PDF : les rendre configurables, sans inventer de règle automatique.

## 5. Parcours et écrans
### Parent
- Connexion / onboarding.
- Dashboard famille : profils, soldes, progression, validations en attente, trésor.
- Gestion enfants.
- Gestion missions et récurrences.
- Validation missions.
- Boutique et validation des demandes.
- Trésor commun.
- Configuration du dé, badges, thème et paramètres.
- Journal d'activité.

### Enfant
- Sélecteur de profil.
- Mon aventure : missions du jour, solde, progression, prochain objectif.
- Mes missions : quotidiennes / héroïques / surprises.
- Détail mission et bouton « J'ai terminé ».
- Ma carte : 50 cases.
- Boutique : récompenses et demande.
- Trésor commun.
- Dé du destin.
- Mes badges.

UX : gros boutons, cibles tactiles >=44px, phrases courtes, pictogrammes accompagnés de libellés, feedback positif, animations courtes et non indispensables. Aucun système de perte punitive de points dans le MVP.

## 6. Règles métier
### Mission
États : `available -> claimed -> approved|rejected`. Pas de double gain sur la même occurrence. Une occurrence récurrente est identifiée par mission + enfant + date locale. Refus = aucun gain. Parent peut enregistrer directement une mission terminée.

### Portefeuille
Le ledger `points_transactions` est la source de vérité. Types suggérés : `mission_reward`, `shop_purchase`, `family_treasure_contribution`, `dice_bonus`, `parent_adjustment_credit`, `parent_adjustment_debit`, `refund`.
- Solde = somme des transactions.
- `lifetime_earned_points` = cumul des gains positifs éligibles.
- Une dépense ne fait jamais reculer la carte.
- Empêcher le solde négatif.
- Toute opération sensible est transactionnelle et idempotente.

### Boutique
L'enfant demande une récompense ; le parent approuve ou refuse. Recommandation : débiter uniquement à l'approbation, dans une transaction atomique avec contrôle du solde et du stock. Le coût est figé dans la demande (`cost_snapshot`).

### Dé
Une disponibilité ne peut être consommée qu'une fois. Vérification du cooldown/compteur et tirage aléatoire côté serveur. Le résultat est persisté et ne doit pas être recalculé à l'affichage.

### Trésor
Contribution atomique : vérifier solde, débiter le portefeuille, enregistrer contribution, mettre à jour progression. Statuts : `active`, `reached`, `claimed`, `archived`.

## 7. Multi-univers
Univers à maquetter :
- Guilde des Aventuriers : forêt, rivière, château, montagnes, sommet ; blasons, coffres, pépites.
- Royaume des Princesses : jardins, lac, palais, royaume céleste.
- Îles des Pirates : port, jungle, criques, île au trésor, grand large.
- Galaxie des Héros : base, lune, planète rouge, nébuleuse, étoiles.
- Monde des Dinosaures : camp, jungle, vallée, volcan, fossiles.

Le thème est une configuration de design tokens et assets. Les règles, composants, données et calculs restent partagés. Ne pas utiliser de personnages ou d'éléments protégés issus de franchises connues. Prévoir palette, textures, typographies, icônes, illustrations de carte et libellés de territoires.

## 8. Auth Google / Supabase
- Supabase Auth avec provider Google.
- Configurer Google OAuth client et callback URI exactement selon les instructions du projet Supabase.
- Configurer Site URL et redirect allowlist Supabase pour `https://zoralia.pomponlabs.com` et les URLs locales nécessaires.
- Après OAuth : créer/récupérer `profiles`, créer ou retrouver l'appartenance à `families`.
- Session via SDK Supabase officiel.
- Jamais de clé `service_role` côté navigateur.
- Le site cible est fourni par l'utilisateur ; le contenu actuel du site et l'infrastructure n'ont pas été audités dans ce document. Les agents doivent inspecter dépôt, DNS, reverse proxy, TLS et hébergement avant de modifier le déploiement.

## 9. Modèle Supabase proposé
Tables (UUID, timestamps, FK, contraintes, index à définir par les agents) :
- `profiles(id -> auth.users, display_name, created_at)`
- `families(id, name, timezone default Europe/Paris, created_by, active_theme_id)`
- `family_members(id, family_id, user_id, role, unique(family_id,user_id))`
- `children(id, family_id, display_name, avatar_key, color_key, is_active, created_at)`
- `themes(id, slug unique, name, description, tokens jsonb, assets jsonb, is_active)`
- `family_settings(family_id, dice_enabled, dice_mode, dice_quest_threshold, treasure_enabled, approval_required, settings jsonb)`
- `missions(id, family_id, title, description, category, points, recurrence jsonb, starts_at, ends_at, requires_approval, is_active, created_by)`
- `mission_children(mission_id, child_id, PK composite)`
- `mission_occurrences(id, mission_id, child_id, due_date, status, claimed_at, reviewed_at, reviewed_by, review_note, unique(mission_id,child_id,due_date))`
- `points_transactions(id, family_id, child_id, amount, type, reference_id, description, created_by, created_at, idempotency_key unique)`
- `shop_rewards(id, family_id, title, description, cost, image_key, stock, is_active)`
- `reward_redemptions(id, family_id, child_id, reward_id, cost_snapshot, status, requested_at, reviewed_at, reviewed_by)`
- `family_treasures(id, family_id, title, target_points, current_points, reward_description, status, created_at)`
- `treasure_contributions(id, treasure_id, child_id, amount, transaction_id, created_at)`
- `dice_rolls(id, family_id, child_id, result_key, result_payload jsonb, rolled_at, consumed_quest_count)`
- `badges(id, slug unique, name, description, icon_key, threshold jsonb, theme_id)`
- `child_badges(child_id, badge_id, earned_at, PK composite)`

Vues : `child_wallet_summary` (solde, cumul des gains), `child_map_progress` (50 max, 1 case / 5 gains). Vérifier les options PostgreSQL/Supabase pour vues avec droits invoker.

RPC / Edge Functions :
- `approve_mission(occurrence_id)`
- `approve_reward(redemption_id)`
- `contribute_to_treasure(treasure_id, child_id, amount)`
- `roll_dice(child_id)`
- `parent_adjust_points(child_id, amount, reason)`
Chaque fonction vérifie l'utilisateur Auth, l'appartenance au foyer, le rôle parent, l'état métier, le solde, les doublons et l'idempotence.

## 10. RLS et protection des données
Activer RLS sur toutes les tables exposées. Un parent ne lit/écrit que les foyers dont il est membre. Les enfants n'ayant pas d'auth propre, ne pas faire confiance à un `child_id` envoyé par le navigateur pour les opérations sensibles : valider côté serveur et lier le contexte au parent authentifié. Les insertions directes dans le ledger sont interdites au client. Tester explicitement les accès inter-foyers.
Stocker le minimum sur les enfants : prénom/pseudo, avatar prédéfini, couleur. Pas de date de naissance, école, localisation, photo réelle ou coordonnées. Prévoir export/suppression par parent. Avant ouverture publique, faire une revue RGPD/CNIL et des obligations liées aux services destinés aux enfants.

## 11. Stack et déploiement
Stack proposée à confirmer après audit du dépôt : Next.js + TypeScript, Tailwind, Supabase, schémas de validation partagés, tests unitaires + SQL/RLS + E2E.
- Domaine cible : `zoralia.pomponlabs.com`, HTTPS obligatoire.
- Migrations SQL versionnées dans `supabase/migrations`.
- Secrets via variables d'environnement, jamais dans Git.
- Variables indicatives :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement)
  - `NEXT_PUBLIC_APP_URL=https://zoralia.pomponlabs.com`
- Google OAuth secrets configurés dans Supabase/Google selon le flux retenu.
- Tester cookies Secure/SameSite, callback OAuth derrière reverse proxy, URL canonique et refresh de session.
- Sauvegarde avant migrations destructives ; prévoir procédure d'export/restauration.

## 12. Tests d'acceptation MVP
1. Parent Google login sur le domaine de test, session restaurée après refresh.
2. Parent crée foyer et deux enfants.
3. Parent crée mission quotidienne +1 ; enfant la réclame ; parent approuve ; une seule transaction +1.
4. Une nouvelle occurrence le jour suivant est disponible ; pas de double gain le même jour.
5. À 25 pépites gagnées cumulées, l'enfant avance de 5 cases.
6. Dépenser des pépites ne fait pas reculer la carte.
7. Récompense approuvée débite atomiquement ; refus ne débite rien.
8. Trésor commun crédite la jauge et débite le contributeur dans la même transaction.
9. Dé impossible avant éligibilité et résultat persistant après rechargement.
10. Parent A ne peut pas lire les données du foyer B en changeant un identifiant.
11. La clé service role n'est jamais présente dans le bundle navigateur.
12. Le thème peut changer sans perdre les données ou la progression.

## 13. Plan d'exécution agents
**Phase 0 — Audit** : inspecter repo, infra PomponLabs, sous-domaine, choix framework, décisions UX ouvertes. Créer `AGENTS.md`.
**Phase 1 — Fondations** : app, design system, Supabase, OAuth Google, profils, foyer, enfants, RLS.
**Phase 2 — Boucle de jeu** : missions, occurrences, validation, ledger, carte, badges.
**Phase 3 — Récompenses** : boutique, trésor, dé.
**Phase 4 — Thèmes** : cinq univers, assets, responsive, accessibilité.
**Phase 5 — Stabilisation** : E2E, audit RLS, OAuth sur domaine, backup/restore, revue RGPD.

Découpage agents possible :
- Architecture/repo & déploiement.
- Supabase schema/RLS/RPC.
- Auth/onboarding.
- Gameplay missions/ledger/carte/badges.
- Boutique/trésor/dé.
- UI/design system/thèmes.
- Intégration, E2E et sécurité.

Définir les contrats API et types partagés avant le développement parallèle. Les mutations sensibles passent par RPC/serveur, jamais par logique frontend seule.

## 14. Décisions ouvertes
1. Thème par foyer ou par enfant ? Recommandation MVP : par foyer.
2. PIN pour changer de profil enfant ? Facultatif, à décider.
3. Validation parentale de toutes les missions ? Recommandation : oui au début.
4. Contribution au trésor déduite du solde enfant ? Recommandation : oui.
5. Tous les gains (bonus compris) font-ils progresser la carte ? Recommandation : oui.
6. Débit boutique à l'approbation ? Recommandation : oui.

## 15. Source et limites
Le gameplay ci-dessus reprend le kit PDF utilisateur « La Guilde des Aventuriers – Kit imprimable A3 ». Le document ne fixe pas les seuils exacts des badges, les effets précis des cases spéciales, ni toutes les règles de récurrence : ces points restent configurables et à confirmer. Les choix d'architecture et de sécurité sont des recommandations techniques pour le développement.
