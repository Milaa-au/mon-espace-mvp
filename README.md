MonEspace
Un tableau de bord personnel modulaire pour s'organiser au quotidien.

MonEspace est une application web qui permet de créer un compte puis d'accéder à un tableau blanc sur lequel on dispose librement des « widgets » : des petits modules qui centralisent ses notes, son planning et sa gestion du temps sur un seul écran. Chaque utilisateur a son propre tableau, retrouvé à l'identique à chaque connexion.

Projet de fin de spécialisation — Holberton School (MVP, version 1.0).

Fonctionnalités
Compte utilisateur : inscription, connexion par email ou pseudo, session par token JWT.
Tableau de bord personnel : un tableau par utilisateur, créé automatiquement à la première visite.
Trois widgets :
Post-it : note à mise en forme riche (gras, italique, listes, polices, tailles) grâce à l'éditeur TinyMCE.
Planning : liste d'événements datés, avec ajout, modification et suppression.
Timer : minuteur configurable (type Pomodoro) avec démarrer, pause et réinitialisation. Il reste exact après un rechargement de la page.
Glisser-déposer et redimensionnement : chaque widget se place librement sur l'écran, et sa position et sa taille sont sauvegardées.
Page Calendrier : vue mensuelle regroupant les événements de tous les plannings, avec création, modification et suppression depuis le calendrier.
Lanceur de widgets : un menu d'icônes pour ajouter un Post-it, un planning ou un timer.
Thème clair / sombre, mémorisé d'une visite à l'autre.
Technologies
Couche	Technologies
Frontend	React 19, Vite, React Router, dnd-kit (glisser-déposer), FullCalendar, TinyMCE Cloud
Backend	Node.js, Express 5, bcrypt, jsonwebtoken
Base de données	PostgreSQL (driver pg)
Tests	node:test (API), Playwright (parcours de bout en bout)
Déploiement	Netlify (frontend), Render (API et base de données)
Architecture
Architecture client-serveur en trois couches :

Navigateur (SPA React)  ──HTTPS / JSON──►  API REST (Express)  ──SQL──►  PostgreSQL
Le modèle de données repose sur une table widgets générique (type, position, taille, ordre d'empilement) et une table par type de widget : postit, planning_event et timer. Ajouter un nouveau type de widget revient donc à ajouter une table et un composant, sans toucher au système de positionnement.

Table	Rôle
users	Comptes utilisateurs
boards	Un tableau par utilisateur
widgets	Widget générique placé sur un tableau
postit	Contenu et couleur d'un Post-it
planning_event	Événements d'un planning (plusieurs par widget)
timer	Durée, temps restant, état et heure de démarrage
Le timer ne fait pas tourner de compteur côté serveur : il stocke l'heure de démarrage et le temps restant, puis recalcule son état à chaque lecture.

API
Méthode	Endpoint	Description
POST	/api/auth/register	Création de compte
POST	/api/auth/login	Connexion, renvoie un JWT
GET	/api/auth/me	Utilisateur connecté
GET	/api/boards	Tableau de l'utilisateur et ses widgets
POST	/api/widgets	Création d'un widget
PATCH	/api/widgets/:id	Position, taille ou contenu d'un Post-it
DELETE	/api/widgets/:id	Suppression d'un widget
GET, POST	/api/widgets/:widgetId/events	Liste et ajout d'événements
PATCH, DELETE	/api/widgets/:widgetId/events/:eventId	Modification et suppression d'un événement
GET	/api/widgets/:widgetId/timer	État du timer
PATCH	/api/widgets/:widgetId/timer/duration	Changement de durée
POST	/api/widgets/:widgetId/timer/start, pause, reset	Contrôle du timer
Toutes les routes, hors inscription et connexion, exigent un token JWT valide dans l'en-tête Authorization: Bearer.

Structure du projet
MonEspace/
├── backend/
│   ├── src/
│   │   ├── db/            connexion PostgreSQL et migrations SQL
│   │   ├── middleware/    vérification du JWT
│   │   ├── models/        accès aux données (widgets, événements, timer)
│   │   ├── routes/        endpoints REST
│   │   └── server.js
│   └── test/              tests de l'API
├── frontend/
│   ├── src/
│   │   ├── components/    WidgetContainer, PostItWidget, PlanningWidget, TimerWidget
│   │   └── pages/         Login, Register, DashboardPage, CalendarPage
│   └── e2e/               tests Playwright
├── netlify.toml           configuration du frontend
└── render.yaml            configuration de l'API et de la base
Installation
Prérequis : Node.js 22+, PostgreSQL 14+ avec psql.

1. Base de données : crée une base vide, puis applique les migrations dans l'ordre.

bash
createdb monespace
cd MonEspace/backend
psql $DATABASE_URL -v ON_ERROR_STOP=1 -f src/db/migrations/001_create_users.sql
psql $DATABASE_URL -v ON_ERROR_STOP=1 -f src/db/migrations/002_create_boards.sql
psql $DATABASE_URL -v ON_ERROR_STOP=1 -f src/db/migrations/003_create_widgets.sql
psql $DATABASE_URL -v ON_ERROR_STOP=1 -f src/db/migrations/004_add_timer_remaining_seconds.sql
2. Variables d'environnement : copie les fichiers d'exemple et remplis-les.

MonEspace/backend/.env.example → MonEspace/backend/.env (DATABASE_URL, JWT_SECRET, FRONTEND_URL, PORT)
MonEspace/.env.example → MonEspace/.env.local (VITE_API_URL, VITE_TINYMCE_API_KEY)
3. Lancement : dans deux terminaux.

bash
# API (http://localhost:5000)
cd MonEspace/backend && npm ci && npm run dev

# Frontend (http://localhost:5173)
cd MonEspace && npm ci && npm run dev
Tests : npm test dans MonEspace/backend pour l'API, npm run test:e2e dans MonEspace pour les parcours Playwright.

Déploiement
Le frontend se déploie sur Netlify (netlify.toml) et l'API avec sa base PostgreSQL sur Render (render.yaml). Après la création de la base, il faut exécuter les migrations 001 à 004 une seule fois, puis renseigner VITE_API_URL côté Netlify et FRONTEND_URL côté Render.

Évolutions envisagées
Nouveaux widgets (liste de tâches Kanban, météo, notes vocales, citation du jour).
Partage d'un tableau entre plusieurs membres d'une même organisation.
Notifications pour les échéances du planning et la fin d'un timer.
Synchronisation avec des agendas externes (Google Calendar, Outlook).
