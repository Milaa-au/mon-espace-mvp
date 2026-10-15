const express = require("express");
const pool = require("../db/connection");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `INSERT INTO boards (user_id)
             VALUES ($1)
             ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
             RETURNING board_id, user_id, name, created_at`,
            [req.user.userId]
        );

        return res.status(200).json({ board: result.rows[0] });
    } catch (error) {
        console.error("Get board error:", error);
        return res.status(500).json({ message: "Unable to load the board" });
    }
});

module.exports = router;