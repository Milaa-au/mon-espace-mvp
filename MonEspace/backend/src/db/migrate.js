// Applique les migrations SQL dans l'ordre. Usage : DATABASE_URL=... node src/db/migrate.js
// Définir PGSSL=true pour une base distante (ex. URL externe Render).
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL est requis");
	}

	const client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
	});
	await client.connect();

	const dir = path.join(__dirname, "migrations");
	const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

	try {
		await client.query("BEGIN");
		for (const file of files) {
			await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
			console.log(`OK ${file}`);
		}
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		await client.end();
	}
}

main().catch((error) => {
	console.error("Migration échouée :", error.message);
	process.exit(1);
});
