// TEST DE PARCOURS COMPLET (intégration) : inscription → connexion → session → tableau.
//
// Ce que ce fichier vérifie, sur une VRAIE API et une VRAIE base PostgreSQL :
//   1. Sans token, /api/auth/me et /api/boards répondent 401.
//   2. Les tables users et boards existent (migrations appliquées).
//   3. On peut créer un compte (201), se connecter (200) et recevoir un JWT.
//   4. /api/auth/me avec le token renvoie bien l'utilisateur créé.
//   5. /api/boards crée le tableau à la première visite, puis renvoie le MÊME tableau ensuite.
//   6. À la fin, l'utilisateur de test est supprimé de la base (nettoyage).
//
// Prérequis : PostgreSQL lancé, migrations appliquées, et l'API démarrée dans un autre terminal
// (cd MonEspace/backend puis npm run dev). L'URL testée est API_URL (http://localhost:5000 par défaut).
// Attention : utilise la base du fichier backend/.env, pas celle de Render.
// Commande : npm run test:auth-flow   (depuis MonEspace/backend)

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Pool } = require("pg");
require("dotenv").config();

// Adresse de l'API à tester.
const apiUrl = process.env.API_URL || "http://localhost:5000";
// Connexion directe à la base, pour vérifier le schéma et supprimer l'utilisateur de test.
const pool = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
              host: process.env.PGHOST || "localhost",
              port: Number(process.env.PGPORT || 5432),
              database: process.env.PGDATABASE,
              user: process.env.PGUSER,
              password: process.env.PGPASSWORD,
          }
);

test("register, login, verify session, and load the user's board", async () => {
    // Email et pseudo uniques à chaque exécution, pour ne jamais entrer en conflit avec de vraies données.
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `auth-flow-${suffix}@example.test`;
    const username = `flow-${suffix}`;
    let registered = false;

    try {
        // Étape 1 : sans token, les routes protégées doivent refuser l'accès.
        let response = await fetch(`${apiUrl}/api/auth/me`);
        assert.equal(response.status, 401);

        response = await fetch(`${apiUrl}/api/boards`);
        assert.equal(response.status, 401);

                // Étape 2 : vérifier que les migrations ont bien créé les tables users et boards.
                const schema = await pool.query(
                        `SELECT table_name, column_name
                         FROM information_schema.columns
                         WHERE table_schema = 'public'
                             AND table_name IN ('users', 'boards')`
                );
                const columns = new Set(schema.rows.map(({ table_name, column_name }) => `${table_name}.${column_name}`));
                const schemaSummary = [...columns].join(", ") || "no public users/boards tables found";
                assert.ok(columns.has("users.id"), `Apply the users migration before running this test. Found: ${schemaSummary}`);
                assert.ok(columns.has("boards.user_id"), `Apply the boards migration before running this test. Found: ${schemaSummary}`);

        // Étape 3 : création du compte.
        response = await fetch(`${apiUrl}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password: "Flow-test-password-2026" }),
        });
        const registration = await response.json();
        assert.equal(response.status, 201, registration.message);
        registered = true;

        // Étape 4 : connexion avec l'email, le serveur doit renvoyer un token JWT.
        response = await fetch(`${apiUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: email, password: "Flow-test-password-2026" }),
        });
        const login = await response.json();
        assert.equal(response.status, 200, login.message);
        assert.ok(login.token);

        const headers = { Authorization: `Bearer ${login.token}` };
        // Étape 5 : le token (en-tête Authorization) donne accès à /me, qui renvoie l'identifiant du compte créé.
        response = await fetch(`${apiUrl}/api/auth/me`, { headers });
        assert.equal(response.status, 200);
        const session = await response.json();
        assert.equal(session.user.userId, registration.user.id);

        // Étape 6 : le tableau est créé à la première lecture, et le même est renvoyé à la seconde.
        response = await fetch(`${apiUrl}/api/boards`, { headers });
        assert.equal(response.status, 200);
        const firstBoard = (await response.json()).board;
        assert.ok(firstBoard.board_id);
        assert.equal(firstBoard.user_id, registration.user.id);

        response = await fetch(`${apiUrl}/api/boards`, { headers });
        assert.equal(response.status, 200);
        const secondBoard = (await response.json()).board;
        assert.equal(secondBoard.board_id, firstBoard.board_id);
    } finally {
        // Nettoyage : on supprime le compte de test (la suppression en cascade retire aussi son tableau).
        if (registered) {
            await pool.query("DELETE FROM users WHERE email = $1", [email]);
        }
        await pool.end();
    }
});
