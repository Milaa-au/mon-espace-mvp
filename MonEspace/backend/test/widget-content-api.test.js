const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const proxyquire = require("proxyquire");
const request = require("supertest");

proxyquire.noCallThru();

function makeApi({ widgetType = "postit" } = {}) {
    const updates = [];
    const pool = {
        query: async () => ({
            rowCount: 1,
            rows: [{ widget_id: "21", type: widgetType }],
        }),
    };
    const authMiddleware = (req, res, next) => {
        req.user = { userId: 7 };
        next();
    };
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

test("PATCH rejects rich-text content on non-Post-it widgets", async () => {
    const { app, updates } = makeApi({ widgetType: "timer" });
    const response = await request(app)
        .patch("/api/widgets/21")
        .send({ content: "nope" })
        .expect(400);

    assert.match(response.body.message, /Post-it/);
    assert.equal(updates.length, 0);
});

test("PATCH enforces a maximum Post-it content size", async () => {
    const { app, updates } = makeApi();
    await request(app)
        .patch("/api/widgets/21")
        .send({ content: "x".repeat(100001) })
        .expect(400);

    assert.equal(updates.length, 0);
});
