
const express = require("express");
const pool = require("../db/connection");
const authMiddleware = require("../middleware/auth");
const { getWidgetsByBoardId } = require("../models/widget.model");

const router = express.Router();

// GET /api/board
router.get("/", authMiddleware, async (req, res) => {
    try {

        const boardResult = await pool.query(
            `INSERT INTO boards (user_id)
             VALUES ($1)
             ON CONFLICT (user_id)
             DO UPDATE SET user_id = EXCLUDED.user_id
             RETURNING board_id, user_id, name, created_at`,
            [req.user.userId]
        );

        const board = boardResult.rows[0];

        const widgets = await getWidgetsByBoardId(board.board_id);

        return res.status(200).json({
            board,
            widgets,
        });
    } catch (error) {
        console.error("Get board error:", error);

        return res.status(500).json({
            message: "Unable to retrieve the array.",
        });
    }
});

module.exports = router;
