// TEST DES ENDPOINTS DE L'API (intégration, vraie base PostgreSQL locale).
//
// Ce fichier appelle chaque endpoint de l'API par de vraies requêtes HTTP et vérifie
// le code de réponse et le contenu :
//   AUTH      POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
//   BOARDS    GET /api/boards
//   WIDGETS   POST /api/widgets, PATCH /api/widgets/:id, DELETE /api/widgets/:id
//   PLANNING  GET/POST /api/widgets/:id/events, PATCH/DELETE /api/widgets/:id/events/:eventId
//   TIMER     GET /timer, PATCH /timer/duration, POST /timer/start, /pause, /reset
// Il vérifie aussi la sécurité : sans token => 401, et un utilisateur ne peut pas lire
// ni modifier les widgets d'un autre utilisateur => 404.
//
// Le test démarre lui-même l'API (src/server.js) sur le port 5055. Il faut donc seulement :
//   - PostgreSQL local lancé, migrations 001 à 004 appliquées ;
//   - backend/.env avec DATABASE_URL et JWT_SECRET.
// Sécurité : le test REFUSE de tourner si DATABASE_URL n'est pas une base locale (ex. Render).
// Les deux utilisateurs de test sont supprimés à la fin (cascade : tableaux, widgets, événements).
//
// Commande : npm run test:api   (depuis MonEspace/backend)

require("dotenv").config();
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { after, before, describe, test } = require("node:test");
const { Pool } = require("pg");

const PORT = 5055;
const API = `http://127.0.0.1:${PORT}`;
const PASSWORD = "Endpoint-test-2026";

// Garde-fou : jamais de test d'intégration sur une base distante.
const databaseUrl = process.env.DATABASE_URL || "";
const isLocalDatabase = !databaseUrl || /@(localhost|127\.0\.0\.1)(:|\/)/.test(databaseUrl);

const pool = new Pool(databaseUrl ? { connectionString: databaseUrl } : {});
let server;
const createdEmails = [];

// Petit client HTTP : envoie du JSON, ajoute le token si fourni, renvoie { status, body }.
async function call(method, route, { token, body } = {}) {
    const response = await fetch(`${API}${route}`, {
        method,
        headers: {
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let json = null;
    try {
        json = JSON.parse(text);
    } catch {
        // Réponse non JSON : on garde json = null.
    }
    return { status: response.status, body: json };
}

// Crée un compte, se connecte et renvoie { token, userId }.
async function createUser(label) {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const email = `endpoint-${label}-${suffix}@example.test`;
    const username = `ep-${label}-${suffix}`;
    createdEmails.push(email);

    const register = await call("POST", "/api/auth/register", {
        body: { username, email, password: PASSWORD },
    });
    assert.equal(register.status, 201, JSON.stringify(register.body));

    const login = await call("POST", "/api/auth/login", {
        body: { identifier: email, password: PASSWORD },
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));

    return { token: login.body.token, userId: register.body.user.id, email, username };
}

// Attend que le serveur réponde sur son URL racine.
async function waitForServer() {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
            const response = await fetch(`${API}/`);
            if (response.ok) return;
        } catch {
            // Pas encore prêt, on réessaie.
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error("L'API n'a pas démarré à temps.");
}

describe("API endpoints", { skip: !isLocalDatabase && "DATABASE_URL n'est pas une base locale : test ignoré." }, () => {
    let alice;
    let bob;
    let board;

    before(async () => {
        // Les tables doivent exister (migrations appliquées).
        const tables = await pool.query(
            `SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public'
               AND table_name IN ('users', 'boards', 'widgets', 'postit', 'planning_event', 'timer')`
        );
        assert.equal(tables.rowCount, 6, "Applique les migrations 001 à 004 avant ce test.");

        // Démarrage de l'API sur un port dédié, pour ne pas gêner un serveur déjà lancé.
        server = spawn(process.execPath, ["src/server.js"], {
            cwd: path.join(__dirname, ".."),
            env: { ...process.env, PORT: String(PORT), NODE_ENV: "development" },
            stdio: "ignore",
        });
        await waitForServer();

        alice = await createUser("alice");
        bob = await createUser("bob");
    });

    after(async () => {
        if (server) server.kill();
        // Nettoyage : la suppression des utilisateurs retire tableaux, widgets et événements (cascade).
        if (createdEmails.length > 0) {
            await pool.query("DELETE FROM users WHERE email = ANY($1)", [createdEmails]);
        }
        await pool.end();
    });

    // ---------- AUTH ----------

    describe("auth", () => {
        test("POST /api/auth/register rejects invalid data (400)", async () => {
            const missing = await call("POST", "/api/auth/register", { body: { username: "abc" } });
            assert.equal(missing.status, 400);

            const shortPassword = await call("POST", "/api/auth/register", {
                body: { username: "abcdef", email: "short@example.test", password: "short" },
            });
            assert.equal(shortPassword.status, 400);
        });

        test("POST /api/auth/register rejects a duplicate email (409)", async () => {
            const response = await call("POST", "/api/auth/register", {
                body: { username: `other-${Date.now()}`, email: alice.email, password: PASSWORD },
            });
            assert.equal(response.status, 409);
        });

        test("POST /api/auth/login accepts email or username and rejects a bad password (401)", async () => {
            const byUsername = await call("POST", "/api/auth/login", {
                body: { identifier: alice.username, password: PASSWORD },
            });
            assert.equal(byUsername.status, 200);
            assert.ok(byUsername.body.token);

            const wrong = await call("POST", "/api/auth/login", {
                body: { identifier: alice.email, password: "mauvais-mot-de-passe" },
            });
            assert.equal(wrong.status, 401);
        });

        test("GET /api/auth/me needs a valid token", async () => {
            assert.equal((await call("GET", "/api/auth/me")).status, 401);
            assert.equal((await call("GET", "/api/auth/me", { token: "faux.token.ici" })).status, 401);

            const response = await call("GET", "/api/auth/me", { token: alice.token });
            assert.equal(response.status, 200);
            assert.equal(response.body.user.userId, alice.userId);
        });
    });

    // ---------- BOARDS ----------

    describe("boards", () => {
        test("GET /api/boards requires a token (401)", async () => {
            assert.equal((await call("GET", "/api/boards")).status, 401);
        });

        test("GET /api/boards creates the board once and returns the same one afterwards", async () => {
            const first = await call("GET", "/api/boards", { token: alice.token });
            assert.equal(first.status, 200);
            assert.equal(first.body.board.user_id, alice.userId);
            assert.deepEqual(first.body.widgets, []);
            board = first.body.board;

            const second = await call("GET", "/api/boards", { token: alice.token });
            assert.equal(second.body.board.board_id, board.board_id);
        });
    });

    // ---------- WIDGETS ----------

    describe("widgets", () => {
        test("POST /api/widgets requires a token (401)", async () => {
            const response = await call("POST", "/api/widgets", {
                body: { boardId: Number(board.board_id), type: "postit" },
            });
            assert.equal(response.status, 401);
        });

        test("POST /api/widgets rejects invalid data (400)", async () => {
            const badType = await call("POST", "/api/widgets", {
                token: alice.token,
                body: { boardId: Number(board.board_id), type: "inconnu" },
            });
            assert.equal(badType.status, 400);

            const badSize = await call("POST", "/api/widgets", {
                token: alice.token,
                body: { boardId: Number(board.board_id), type: "postit", width: -5 },
            });
            assert.equal(badSize.status, 400);
        });

        test("POST /api/widgets cannot add a widget to someone else's board (404)", async () => {
            const response = await call("POST", "/api/widgets", {
                token: bob.token,
                body: { boardId: Number(board.board_id), type: "postit" },
            });
            assert.equal(response.status, 404);
        });

        test("POST, PATCH and DELETE /api/widgets manage a Post-it", async () => {
            const created = await call("POST", "/api/widgets", {
                token: alice.token,
                body: { boardId: Number(board.board_id), type: "postit", posX: 10, posY: 20, data: { content: "<p>Salut</p>" } },
            });
            assert.equal(created.status, 201);
            assert.equal(created.body.widget.type, "postit");
            assert.equal(created.body.widget.data.content, "<p>Salut</p>");
            const id = created.body.widget.widget_id;

            // Le widget apparaît dans le tableau.
            const boardResponse = await call("GET", "/api/boards", { token: alice.token });
            assert.ok(boardResponse.body.widgets.some((widget) => widget.widget_id === id));

            // Modification : position, taille, contenu et couleur.
            const patched = await call("PATCH", `/api/widgets/${id}`, {
                token: alice.token,
                body: { posX: 300, posY: 150, width: 420, content: "<p>Modifié</p>", color: "pink" },
            });
            assert.equal(patched.status, 200);
            assert.equal(patched.body.widget.pos_x, 300);
            assert.equal(patched.body.widget.width, 420);
            assert.equal(patched.body.widget.data.content, "<p>Modifié</p>");
            assert.equal(patched.body.widget.data.color, "pink");
            const reloaded = await call("GET", "/api/boards", { token: alice.token });
            assert.equal(reloaded.body.widgets.find((widget) => widget.widget_id === id).data.color, "pink");
            assert.equal((await call("PATCH", `/api/widgets/${id}`, { token: alice.token, body: { color: "red" } })).status, 400);

            // Champ inconnu et corps vide refusés.
            assert.equal((await call("PATCH", `/api/widgets/${id}`, { token: alice.token, body: { nimporte: 1 } })).status, 400);
            assert.equal((await call("PATCH", `/api/widgets/${id}`, { token: alice.token, body: {} })).status, 400);

            // Un autre utilisateur ne peut ni modifier ni supprimer ce widget.
            assert.equal((await call("PATCH", `/api/widgets/${id}`, { token: bob.token, body: { posX: 1 } })).status, 404);
            assert.equal((await call("DELETE", `/api/widgets/${id}`, { token: bob.token })).status, 404);

            // Suppression par le propriétaire, puis le widget n'existe plus.
            assert.equal((await call("DELETE", `/api/widgets/${id}`, { token: alice.token })).status, 200);
            assert.equal((await call("DELETE", `/api/widgets/${id}`, { token: alice.token })).status, 404);
        });

        test("PATCH /api/widgets/:id rejects an invalid id (400)", async () => {
            const response = await call("PATCH", "/api/widgets/abc", { token: alice.token, body: { posX: 1 } });
            assert.equal(response.status, 400);
        });
    });

    // ---------- PLANNING ----------

    describe("planning events", () => {
        let planningId;
        let eventId;

        before(async () => {
            const created = await call("POST", "/api/widgets", {
                token: alice.token,
                body: { boardId: Number(board.board_id), type: "planning" },
            });
            assert.equal(created.status, 201);
            planningId = created.body.widget.widget_id;
        });

        test("events routes require a token (401)", async () => {
            assert.equal((await call("GET", `/api/widgets/${planningId}/events`)).status, 401);
        });

        test("POST /events rejects invalid data (400)", async () => {
            const noTitle = await call("POST", `/api/widgets/${planningId}/events`, {
                token: alice.token,
                body: { startDate: "2026-12-01T10:00:00Z" },
            });
            assert.equal(noTitle.status, 400);

            const endBeforeStart = await call("POST", `/api/widgets/${planningId}/events`, {
                token: alice.token,
                body: { title: "Réunion", startDate: "2026-12-01T10:00:00Z", endDate: "2026-12-01T09:00:00Z" },
            });
            assert.equal(endBeforeStart.status, 400);
        });

        test("POST, GET, PATCH and DELETE /events manage an event", async () => {
            const created = await call("POST", `/api/widgets/${planningId}/events`, {
                token: alice.token,
                body: { title: "Réunion", startDate: "2026-12-01T10:00:00Z", endDate: "2026-12-01T11:00:00Z", description: "Salle A" },
            });
            assert.equal(created.status, 201);
            assert.equal(created.body.event.title, "Réunion");
            eventId = created.body.event.eventId ?? created.body.event.event_id;
            assert.ok(eventId);

            const list = await call("GET", `/api/widgets/${planningId}/events`, { token: alice.token });
            assert.equal(list.status, 200);
            assert.equal(list.body.events.length, 1);

            const patched = await call("PATCH", `/api/widgets/${planningId}/events/${eventId}`, {
                token: alice.token,
                body: { title: "Réunion déplacée", startDate: "2026-12-02T10:00:00Z" },
            });
            assert.equal(patched.status, 200);
            assert.equal(patched.body.event.title, "Réunion déplacée");

            assert.equal((await call("DELETE", `/api/widgets/${planningId}/events/${eventId}`, { token: alice.token })).status, 200);
            assert.equal((await call("DELETE", `/api/widgets/${planningId}/events/${eventId}`, { token: alice.token })).status, 404);

            const empty = await call("GET", `/api/widgets/${planningId}/events`, { token: alice.token });
            assert.equal(empty.body.events.length, 0);
        });

        test("another user cannot read or write the events (404)", async () => {
            assert.equal((await call("GET", `/api/widgets/${planningId}/events`, { token: bob.token })).status, 404);
            const response = await call("POST", `/api/widgets/${planningId}/events`, {
                token: bob.token,
                body: { title: "Intrus", startDate: "2026-12-01T10:00:00Z" },
            });
            assert.equal(response.status, 404);
        });
    });

    // ---------- TIMER ----------

    describe("timer", () => {
        let timerId;

        before(async () => {
            const created = await call("POST", "/api/widgets", {
                token: alice.token,
                body: { boardId: Number(board.board_id), type: "timer", data: { durationSeconds: 600 } },
            });
            assert.equal(created.status, 201);
            timerId = created.body.widget.widget_id;
        });

        test("timer routes require a token (401)", async () => {
            assert.equal((await call("GET", `/api/widgets/${timerId}/timer`)).status, 401);
        });

        test("GET /timer returns the initial idle state", async () => {
            const response = await call("GET", `/api/widgets/${timerId}/timer`, { token: alice.token });
            assert.equal(response.status, 200);
            assert.equal(response.body.timer.status, "idle");
            assert.equal(response.body.timer.durationSeconds, 600);
        });

        test("PATCH /timer/duration validates and saves the duration", async () => {
            const invalid = await call("PATCH", `/api/widgets/${timerId}/timer/duration`, {
                token: alice.token,
                body: { durationSeconds: 0 },
            });
            assert.equal(invalid.status, 400);

            const valid = await call("PATCH", `/api/widgets/${timerId}/timer/duration`, {
                token: alice.token,
                body: { durationSeconds: 300 },
            });
            assert.equal(valid.status, 200);
            assert.equal(valid.body.timer.durationSeconds, 300);
        });

        test("POST /start, /pause and /reset drive the timer state", async () => {
            const started = await call("POST", `/api/widgets/${timerId}/timer/start`, { token: alice.token });
            assert.equal(started.status, 200);
            assert.equal(started.body.timer.status, "running");

            // On ne peut pas changer la durée pendant que le timer tourne.
            const whileRunning = await call("PATCH", `/api/widgets/${timerId}/timer/duration`, {
                token: alice.token,
                body: { durationSeconds: 120 },
            });
            assert.equal(whileRunning.status, 409);

            const paused = await call("POST", `/api/widgets/${timerId}/timer/pause`, { token: alice.token });
            assert.equal(paused.status, 200);
            assert.equal(paused.body.timer.status, "paused");

            // Mettre en pause un timer déjà en pause est refusé.
            assert.equal((await call("POST", `/api/widgets/${timerId}/timer/pause`, { token: alice.token })).status, 409);

            const reset = await call("POST", `/api/widgets/${timerId}/timer/reset`, { token: alice.token });
            assert.equal(reset.status, 200);
            assert.equal(reset.body.timer.status, "idle");
            assert.equal(reset.body.timer.remainingSeconds, reset.body.timer.durationSeconds);
        });

        test("another user cannot control the timer (404)", async () => {
            assert.equal((await call("GET", `/api/widgets/${timerId}/timer`, { token: bob.token })).status, 404);
            assert.equal((await call("POST", `/api/widgets/${timerId}/timer/start`, { token: bob.token })).status, 404);
        });
    });
});
