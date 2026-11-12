// TEST DES ROUTES D'AUTHENTIFICATION (/api/auth/*) ET DU MIDDLEWARE JWT.
//
// Ce que ce fichier vérifie :
//   1. POST /register refuse les données invalides (400) et les doublons (409), et crée un compte (201).
//   2. POST /login refuse un mauvais identifiant ou mot de passe (401) et renvoie un JWT valide (200).
//   3. GET /me refuse une requête sans token, avec un token mal formé ou falsifié (401),
//      et accepte un token valide (200).
//
// Ce test n'a besoin NI de PostgreSQL NI du serveur lancé : la base est simulée (mock).
// Commande : npm run test:auth-routes   (depuis MonEspace/backend)

const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcrypt");
const express = require("express");
const jwt = require("jsonwebtoken");
const proxyquire = require("proxyquire");
const request = require("supertest");

proxyquire.noCallThru();

// Secret utilisé uniquement pendant ce test pour signer et vérifier les tokens.
process.env.JWT_SECRET = "test-secret";

// Construit une mini-application Express avec les vraies routes d'auth,
// mais avec une fausse base de données dont on contrôle les réponses.
// "responses" contient, dans l'ordre, les résultats que pool.query renverra.
function makeApi(responses = []) {
    const queries = [];
    const pool = {
        query: async (sql, params) => {
            queries.push({ sql, params });
            return responses.shift() ?? { rows: [] };
        },
    };
    const authRoutes = proxyquire("../src/routes/auth.routes.js", {
        "../db/connection": pool,
    });
    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);

    return { app, queries };
}

const validBody = {
    username: "alice",
    email: "alice@example.test",
    password: "password-123",
};

// ---------- INSCRIPTION ----------

test("register rejects a request with missing fields", async () => {
    const { app, queries } = makeApi();
    await request(app).post("/api/auth/register").send({ username: "alice" }).expect(400);

    // Aucune requête SQL ne doit partir si les champs sont invalides.
    assert.equal(queries.length, 0);
});

test("register rejects an invalid email", async () => {
    const { app } = makeApi();
    const response = await request(app)
        .post("/api/auth/register")
        .send({ ...validBody, email: "pas-un-email" })
        .expect(400);

    assert.match(response.body.message, /email/i);
});

test("register rejects a password shorter than 8 characters", async () => {
    const { app } = makeApi();
    const response = await request(app)
        .post("/api/auth/register")
        .send({ ...validBody, password: "short" })
        .expect(400);

    assert.match(response.body.message, /8 characters/);
});

test("register rejects an email that is already used (409)", async () => {
    // Première requête SQL (contrôle de l'email) : un utilisateur existe déjà.
    const { app } = makeApi([{ rows: [{ id: 1 }] }]);
    await request(app).post("/api/auth/register").send(validBody).expect(409);
});

test("register creates the account and never stores the clear password", async () => {
    // 1) email libre  2) username libre  3) INSERT renvoie l'utilisateur créé.
    const { app, queries } = makeApi([
        { rows: [] },
        { rows: [] },
        { rows: [{ id: 5, username: "alice", email: "alice@example.test" }] },
    ]);
    const response = await request(app).post("/api/auth/register").send(validBody).expect(201);

    assert.equal(response.body.user.id, 5);

    // Le 3e paramètre de l'INSERT est le hash bcrypt, jamais le mot de passe en clair.
    const savedHash = queries[2].params[2];
    assert.notEqual(savedHash, validBody.password);
    assert.ok(await bcrypt.compare(validBody.password, savedHash));
});

// ---------- CONNEXION ----------

test("login rejects missing credentials", async () => {
    const { app } = makeApi();
    await request(app).post("/api/auth/login").send({ identifier: "alice" }).expect(400);
});

test("login rejects an unknown user with a generic message", async () => {
    const { app } = makeApi([{ rows: [] }]);
    const response = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "inconnu", password: "password-123" })
        .expect(401);

    // Même message qu'un mauvais mot de passe : on ne révèle pas si le compte existe.
    assert.equal(response.body.message, "Invalid credentials");
});

test("login rejects a wrong password", async () => {
    const passwordHash = await bcrypt.hash("bon-mot-de-passe", 4);
    const { app } = makeApi([
        { rows: [{ id: 5, username: "alice", email: "alice@example.test", password_hash: passwordHash }] },
    ]);
    await request(app)
        .post("/api/auth/login")
        .send({ identifier: "alice", password: "mauvais-mot-de-passe" })
        .expect(401);
});

test("login returns a signed JWT that contains the user id", async () => {
    const passwordHash = await bcrypt.hash("password-123", 4);
    const { app } = makeApi([
        { rows: [{ id: 5, username: "alice", email: "alice@example.test", password_hash: passwordHash }] },
    ]);
    const response = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "alice", password: "password-123" })
        .expect(200);

    const payload = jwt.verify(response.body.token, process.env.JWT_SECRET);
    assert.equal(payload.userId, 5);
    assert.equal(payload.username, "alice");

    // Le hash du mot de passe ne doit jamais être renvoyé au client.
    assert.equal(response.body.user.password_hash, undefined);
});

// ---------- SESSION (middleware JWT) ----------

test("me rejects a request without token", async () => {
    const { app } = makeApi();
    await request(app).get("/api/auth/me").expect(401);
});

test("me rejects a badly formatted Authorization header", async () => {
    const { app } = makeApi();
    await request(app).get("/api/auth/me").set("Authorization", "Token abc").expect(401);
});

test("me rejects a token signed with another secret", async () => {
    const { app } = makeApi();
    const forged = jwt.sign({ userId: 1 }, "autre-secret");
    await request(app).get("/api/auth/me").set("Authorization", `Bearer ${forged}`).expect(401);
});

test("me rejects an expired token", async () => {
    const { app } = makeApi();
    const expired = jwt.sign({ userId: 1 }, process.env.JWT_SECRET, { expiresIn: -10 });
    await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expired}`).expect(401);
});

test("me accepts a valid token and returns the user", async () => {
    const { app } = makeApi();
    const token = jwt.sign({ userId: 5, username: "alice" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

    assert.equal(response.body.user.userId, 5);
});
