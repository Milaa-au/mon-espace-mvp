const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Pool } = require("pg");
require("dotenv").config();

const apiUrl = process.env.API_URL || "http://localhost:5000";
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
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `auth-flow-${suffix}@example.test`;
    const username = `flow-${suffix}`;
    let registered = false;

    try {
        let response = await fetch(`${apiUrl}/api/auth/me`);
        assert.equal(response.status, 401);

        response = await fetch(`${apiUrl}/api/boards`);
        assert.equal(response.status, 401);

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

        response = await fetch(`${apiUrl}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password: "Flow-test-password-2026" }),
        });
        const registration = await response.json();
        assert.equal(response.status, 201, registration.message);
        registered = true;

        response = await fetch(`${apiUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: email, password: "Flow-test-password-2026" }),
        });
        const login = await response.json();
        assert.equal(response.status, 200, login.message);
        assert.ok(login.token);

        const headers = { Authorization: `Bearer ${login.token}` };
        response = await fetch(`${apiUrl}/api/auth/me`, { headers });
        assert.equal(response.status, 200);
        const session = await response.json();
        assert.equal(session.user.userId, registration.user.id);

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
        if (registered) {
            await pool.query("DELETE FROM users WHERE email = $1", [email]);
        }
        await pool.end();
    }
});
