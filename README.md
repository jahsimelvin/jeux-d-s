# jeux-d-s
ce jeux repose sur le principe du matchmaking ou l'on peut jouer au même jeux sur deux pc différents


utilisateur :
pseudo1 = melvin
mdp = Azerty1234

pseudo2 = djoufara
mdp = Azerty1234


admin :
pseudo = admin
mdp = admin123


---

## Dossiers et Fichiers

### `/middleware`
- **auth.js**  
  Vérifie qu’un utilisateur est connecté avant d’autoriser l’accès aux routes protégées.
- **roles.js**  
  Vérifie qu’un utilisateur a le rôle `admin` avant d’autoriser l’accès aux routes d’administration.

### `/routes`
- **pages.js**  
  Définit les routes HTTP pour servir les fichiers HTML publics, protégés et d’administration.
- **auth.js**  
  Gère l’inscription (`/register`), la connexion (`/login`) et la déconnexion (`/logout`).
- **api-rules.js**  
  Expose l’API REST pour lire (`GET /api/rules`) et mettre à jour (`POST /admin/rules`) les règles du jeu.
- **api-history.js**  
  Fournit l’historique des parties d’un utilisateur connecté via `GET /api/history`.
- **api-leaderboard.js**  
  Renvoie le classement global des joueurs par victoires via `GET /api/leaderboard`.

### `/public`
- **admin.html**  
  Interface de gestion CRUD pour les utilisateurs, les règles et le classement (accès admin).
- **header.html**  
  Template HTML pour la barre de navigation incluable dynamiquement dans toutes les pages.
- **history.html**  
  Affiche l’historique détaillé des parties du joueur connecté.
- **home.html**  
  Tableau de bord principal où le matchmaking et le lancer de dés s’effectuent.
- **index.html**  
  Page d’accueil avec logo et bouton “Commencer” redirigeant vers la connexion.
- **leaderboard.html**  
  Affiche le classement des joueurs dans une vue publique après connexion.
- **login.html**  
  Formulaire de connexion pour accéder aux fonctionnalités protégées.
- **profile.html**  
  Formulaire de mise à jour du profil (nom, pseudo, sexe, localisation).
- **register.html**  
  Formulaire d’inscription pour créer un nouveau compte utilisateur.
- **rules.html**  
  Affiche dynamiquement les règles du jeu à partir de la base de données.
- **style.css**  
  Styles globaux (mise en page, composants, thèmes) pour toutes les pages.
- **client.js**  
  Code client Socket.IO et appels `fetch()` pour le matchmaking et les APIs.
- **dice.png**  
  Icône/logo du dé utilisé dans l’interface et comme favicon.

### À la racine
- **db.js**  
  Configure et exporte le pool de connexions MySQL pour toutes les requêtes BDD.
- **socket.js**  
  Contient la logique de matchmaking et de gestion des parties via Socket.IO.
- **server.js**  
  Point d’entrée de l’application : configure Express, les sessions, les routes, les assets et démarre le serveur.
- **package.json & package-lock.json**  
  Liste des dépendances et scripts NPM pour installer et exécuter le projet.
- **README.md**  
  Documentation du projet (ce fichier).
