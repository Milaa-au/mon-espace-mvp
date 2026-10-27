const express = require("express");
const pool = require("../db/connection");
const authMiddleware = require("../middleware/auth");
const {
    createWidget,
    updateWidget,
    deleteWidget,
} = require("../models/widget.model");

const router = express.Router();

const ALLOWED_TYPES = ["postit", "planning", "timer"];
const ALLOWED_PATCH_FIELDS = [
    "posX",
    "posY",
    "width",
    "height",
    "zIndex",
];

// POST /api/widgets
// Créer un widget sur le tableau de l'utilisateur connecté.
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            boardId,
            type,
            posX = 0,
            posY = 0,
            width = 300,
            height = 200,
            zIndex = 0,
            data = {},
        } = req.body;

        if (
            !Number.isSafeInteger(Number(boardId)) ||
            Number(boardId) <= 0
        ) {
            return res.status(400).json({
                message: "boardId doit être un entier positif.",
            });
        }

        if (!ALLOWED_TYPES.includes(type)) {
            return res.status(400).json({
                message: "Type invalide. Valeurs autorisées : postit, planning, timer.",
            });
        }

        const coordinates = { posX, posY, width, height, zIndex };

        for (const [field, value] of Object.entries(coordinates)) {
            if (!Number.isSafeInteger(value)) {
                return res.status(400).json({
                    message: `${field} doit être un entier.`,
                });
            }
        }

        if (width <= 0 || height <= 0) {
            return res.status(400).json({
                message: "La largeur et la hauteur doivent être positives.",
            });
        }

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return res.status(400).json({
                message: "data doit être un objet JSON.",
            });
        }

        const boardResult = await pool.query(
            `SELECT board_id
             FROM boards
             WHERE board_id = $1 AND user_id = $2`,
            [Number(boardId), req.user.userId]
        );

        if (boardResult.rowCount === 0) {
            return res.status(404).json({
                message: "Tableau introuvable.",
            });
        }

        const widget = await createWidget({
            boardId: Number(boardId),
            type,
            posX,
            posY,
            width,
            height,
            zIndex,
            data,
        });

        return res.status(201).json({
            message: "Widget créé avec succès.",
            widget,
        });
    } catch (error) {
        console.error("Create widget error:", error);

        return res.status(500).json({
            message: "Impossible de créer le widget.",
        });
    }
});

// PATCH /api/widgets/:id
// Modifier la position ou les dimensions d'un widget.
router.patch("/:id", authMiddleware, async (req, res) => {
    try {
        const widgetId = req.params.id;

        if (!/^[1-9]\d*$/.test(widgetId)) {
            return res.status(400).json({
                message: "Identifiant de widget invalide.",
            });
        }

        const fields = req.body;

        if (
            !fields ||
            typeof fields !== "object" ||
            Array.isArray(fields)
        ) {
            return res.status(400).json({
                message: "Le corps de la requête doit être un objet JSON.",
            });
        }

        const providedFields = Object.keys(fields);

        if (providedFields.length === 0) {
            return res.status(400).json({
                message: "Au moins un champ doit être fourni.",
            });
        }

        const invalidFields = providedFields.filter(
            (field) => !ALLOWED_PATCH_FIELDS.includes(field)
        );

        if (invalidFields.length > 0) {
            return res.status(400).json({
                message: `Champs non autorisés : ${invalidFields.join(", ")}.`,
            });
        }

        for (const [field, value] of Object.entries(fields)) {
            if (!Number.isSafeInteger(value)) {
                return res.status(400).json({
                    message: `${field} doit être un entier.`,
                });
            }
        }

        if (
            (fields.width !== undefined && fields.width <= 0) ||
            (fields.height !== undefined && fields.height <= 0)
        ) {
            return res.status(400).json({
                message: "La largeur et la hauteur doivent être positives.",
            });
        }

        const ownershipResult = await pool.query(
            `SELECT w.widget_id
             FROM widgets w
             JOIN boards b ON b.board_id = w.board_id
             WHERE w.widget_id = $1
               AND b.user_id = $2`,
            [widgetId, req.user.userId]
        );

        if (ownershipResult.rowCount === 0) {
            return res.status(404).json({
                message: "Widget introuvable.",
            });
        }

        const widget = await updateWidget(widgetId, fields);

        if (!widget) {
            return res.status(404).json({
                message: "Widget introuvable.",
            });
        }

        return res.status(200).json({
            message: "Widget modifié avec succès.",
            widget,
        });
    } catch (error) {
        console.error("Update widget error:", error);

        return res.status(500).json({
            message: "Impossible de modifier le widget.",
        });
    }
});

// DELETE /api/widgets/:id
// Supprimer un widget appartenant à l'utilisateur connecté.
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const widgetId = req.params.id;

        if (!/^[1-9]\d*$/.test(widgetId)) {
            return res.status(400).json({
                message: "Identifiant de widget invalide.",
            });
        }

        const ownershipResult = await pool.query(
            `SELECT w.widget_id
             FROM widgets w
             JOIN boards b ON b.board_id = w.board_id
             WHERE w.widget_id = $1
               AND b.user_id = $2`,
            [widgetId, req.user.userId]
        );

        if (ownershipResult.rowCount === 0) {
            return res.status(404).json({
                message: "Widget introuvable.",
            });
        }

        const deleted = await deleteWidget(widgetId);

        if (!deleted) {
            return res.status(404).json({
                message: "Widget introuvable.",
            });
        }

        return res.status(200).json({
            message: "Widget supprimé avec succès.",
        });
    } catch (error) {
        console.error("Delete widget error:", error);

        return res.status(500).json({
            message: "Impossible de supprimer le widget.",
        });
    }
});

module.exports = router;