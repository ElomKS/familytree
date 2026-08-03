# Arbre généalogique

Application d'arbre généalogique partagé, en français. Client React + Tailwind CSS, API Node.js/Express, base de données PostgreSQL.

## Fonctionnalités

- **Registre** : liste des membres (masquée jusqu'à la recherche), pagination, recherche par nom
- **Familles** : vue par familles avec accès à la famille nucléaire d'un membre (ascendants, conjoints, enfants)
- **Ajout de liens** : sélecteur avec autocomplétion ou saisie libre (crée automatiquement la personne)
- **Photos** : téléversement d'une photo par membre (redimensionnée côté client)
- **GEDCOM** : export/import de l'arbre
- **Comptes** : connexion, rôles `admin` / `staff`, changement de mot de passe

## Architecture

- `client/` — application React (CRA + Tailwind). En dev, l'API est appelée sur `http://localhost:3001/api`.
- `server/` — API Express. En production, sert aussi le build du client (`client/build`) sur le même port.
- Une seule base PostgreSQL partagée (`server/db.js`), en SSL pour les connexions non locales.

## Lancement en local

Prérequis : Node.js 18+, accès à une base PostgreSQL.

1. Installer les dépendances :
   ```bash
   npm install --prefix server
   npm install --prefix client
   ```
2. Configurer la base de données : créer `server/.env` :
   ```
   DATABASE_URL=postgres://utilisateur:motdepasse@hote:5432/nom_base?sslmode=require
   JWT_SECRET=changez-moi-par-une-chaine-longue-et-aleatoire
   FRONTEND_URL=http://localhost:3000
   ```
   Les tables sont créées automatiquement au démarrage. Un compte `admin` / `admin123` est créé au premier lancement (changez ce mot de passe dès la première connexion).
3. Lancer le serveur API :
   ```bash
   npm run start --prefix server
   ```
4. Dans un autre terminal, lancer le client :
   ```bash
   npm start --prefix client
   ```
5. Ouvrir http://localhost:3000 et se connecter.

## Déploiement sur Render

Le repo est conçu pour être déployé sur un **seul service Web Render** qui sert à la fois le client et l'API.

1. Pousser le projet sur GitHub.
2. Dans Render : **New → Web Service**, connecter le dépôt GitHub.
3. Configurer le service :
   - **Build command** : `npm install && npm run build`
   - **Start command** : `npm start`
4. Ajouter les variables d'environnement :
   - `DATABASE_URL` — l'URL de la base PostgreSQL (obligatoire)
   - `JWT_SECRET` — une longue chaîne aléatoire (obligatoire, sinon un secret par défaut est utilisé)
   - `FRONTEND_URL` — facultatif, l'URL publique du service (pour CORS si le client est hébergé ailleurs)
5. Déployer. L'application est accessible à l'URL fournie par Render (ex. `https://mon-arbre.onrender.com`).

### Notes de sécurité

- Changez le mot de passe du compte `admin` (par défaut `admin123`) via l'onglet Comptes.
- Créez des comptes `staff` pour les autres membres de la famille (sans accès à la suppression ni à l'import GEDCOM).
- `server/.env` et les fichiers `.env` sont ignorés par git : ne les commitez jamais.
