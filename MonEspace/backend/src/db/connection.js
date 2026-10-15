require("dotenv").config();
const { Pool } = require("pg");

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

pool.on("error", (error) => {
	console.error("Unexpected PostgreSQL pool error:", error);
});

module.exports = pool;
