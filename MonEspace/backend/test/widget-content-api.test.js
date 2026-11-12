// TEST DE LA ROUTE PATCH /api/widgets/:id (contenu des Post-it).
//
// Ce que ce fichier vérifie :
//   1. Le HTML d'un Post-it (gras, italique...) est bien transmis au model pour être enregistré.
//   2. Envoyer du contenu texte à un widget qui n'est pas un Post-it (ex. un timer) est refusé (400).
//   3. Un contenu de plus de 100 000 caractères est refusé (400).
//   Dans les cas refusés, le model ne doit JAMAIS être appelé (rien n'est écrit en base).
//
// Ce test n'a besoin NI de PostgreSQL NI du serveur lancé : la base, le middleware JWT et le model
// sont remplacés par de faux objets (proxyquire). Seule la vraie route est testée.
// Commande : npm test   (depuis MonEspace/backend)

const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const proxyquire = require("proxyquire");
const request = require("supertest");

// noCallThru : les vrais modules (base, JWT) ne sont jamais chargés, seuls les faux sont utilisés.
proxyquire.noCallThru();

// Construit une mini-application Express avec la vraie route widgets et de fausses dépendances.
// widgetType : type du widget simulé en base ("postit" ou "timer").
// updates : liste des appels reçus par le faux model, pour vérifier ce qui aurait été enregistré.
function makeApi({ widgetType = "postit" } = {}) {
    const updates = [];
    // Fausse base : le widget 21 existe, appartient à l'utilisateur et a le type demandé.
    const pool = {
        query: async () => ({
            rowCount: 1,
            rows: [{ widget_id: "21", type: widgetType }],
        }),
    };
    // Faux middleware JWT : considère l'utilisateur 7 comme connecté.
    const authMiddleware = (req, res, next) => {
        req.user = { userId: 7 };
        next();
    };
    // Faux model : enregistre les appels au lieu d'écrire en base.
    const widgetModel = {
        createWidget: async () => null,
        updateWidget: async (widgetId, fields) => {
            updates.push({ widgetId, fields });
            return { widget_id: widgetId, ...fields };
        },
        deleteWidget: async () => null,
    };
    const widgetRoutes = proxyquire("../src/routes/widgets.routes.js", {
        "../db/connection": pool,
        "../middleware/auth": authMiddleware,
        "../models/widget.model": widgetModel,
    });
    const app = express();
    app.use(express.json());
    app.use("/api/widgets", widgetRoutes);

    return { app, updates };
}

// Cas 1 : un Post-it accepte du HTML riche, avec position et largeur.
test("PATCH saves Post-it rich-text HTML", async () => {
    const { app, updates } = makeApi();
    const content = '<p><strong>Note</strong> <em>formatee</em></p>';
    const response = await request(app)
        .patch("/api/widgets/21")
        .send({ content, posX: 120, width: 360 })
        .expect(200);

    assert.equal(response.body.widget.content, content);
    assert.deepEqual(updates[0], {
        widgetId: "21",
        fields: { content, posX: 120, width: 360 },
    });
});

// Cas 2 : un timer ne peut pas recevoir de contenu texte.
test("PATCH rejects rich-text content on non-Post-it widgets", async () => {
    const { app, updates } = makeApi({ widgetType: "timer" });
    const response = await request(app)
        .patch("/api/widgets/21")
        .send({ content: "nope" })
        .expect(400);

    assert.match(response.body.message, /Post-it/);
    assert.equal(updates.length, 0);
});

// Cas 3 : un contenu de 100 001 caractères dépasse la limite (100 000) et est refusé.
test("PATCH enforces a maximum Post-it content size", async () => {
    const { app, updates } = makeApi();
    await request(app)
        .patch("/api/widgets/21")
        .send({ content: "x".repeat(100001) })
        .expect(400);

    assert.equal(updates.length, 0);
});

test("PATCH accepts supported Post-it colors", async () => {
    const { app, updates } = makeApi();
    await request(app).patch("/api/widgets/21").send({ color: "pink" }).expect(200);
    assert.deepEqual(updates[0].fields, { color: "pink" });
});

test("PATCH rejects invalid colors and colors on other widgets", async () => {
    const postit = makeApi();
    const timer = makeApi({ widgetType: "timer" });
    await request(postit.app).patch("/api/widgets/21").send({ color: "red" }).expect(400);
    await request(timer.app).patch("/api/widgets/21").send({ color: "pink" }).expect(400);
    assert.equal(postit.updates.length, 0);
    assert.equal(timer.updates.length, 0);
});
