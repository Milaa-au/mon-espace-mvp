const express = require("express");
const pool = require("../db/connection");
const authMiddleware = require("../middleware/auth");
const {
    getPlanningEvents,
    createPlanningEvent,
    updatePlanningEvent,
    deletePlanningEvent,
} = require("../models/planning-event.model");

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

function isPositiveId(value) {
    return /^[1-9]\d*$/.test(value);
}

function validateEvent(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { error: "Le corps de la requête doit être un objet JSON." };
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const startDate = new Date(body.startDate);
    const endDate = body.endDate ? new Date(body.endDate) : null;

    if (!title || title.length > 255) {
        return { error: "Le titre est obligatoire et limité à 255 caractères." };
    }

    if (!body.startDate || Number.isNaN(startDate.getTime())) {
        return { error: "Une date de début valide est obligatoire." };
    }

    if (endDate && Number.isNaN(endDate.getTime())) {
        return { error: "La date de fin est invalide." };
    }

    if (endDate && endDate < startDate) {
        return { error: "La date de fin doit être après la date de début." };
    }

    if (body.description != null && typeof body.description !== "string") {
        return { error: "La description doit être une chaîne de caractères." };
    }

    return {
        value: {
            title,
            startDate: startDate.toISOString(),
            endDate: endDate ? endDate.toISOString() : null,
            description: body.description?.trim() || null,
        },
    };
}

async function ownsPlanningWidget(widgetId, userId) {
    const result = await pool.query(
        `SELECT w.widget_id
         FROM widgets w
         JOIN boards b ON b.board_id = w.board_id
         WHERE w.widget_id = $1
           AND w.type = 'planning'
           AND b.user_id = $2`,
        [widgetId, userId]
    );

    return result.rowCount > 0;
}

router.use(async (req, res, next) => {
    const { widgetId } = req.params;

    if (!isPositiveId(widgetId)) {
        return res.status(400).json({ message: "Identifiant de planning invalide." });
    }

    try {
        if (!(await ownsPlanningWidget(widgetId, req.user.userId))) {
            return res.status(404).json({ message: "Planning introuvable." });
        }

        return next();
    } catch (error) {
        console.error("Planning ownership error:", error);
        return res.status(500).json({ message: "Impossible de vérifier le planning." });
    }
});

router.get("/", async (req, res) => {
    try {
        const events = await getPlanningEvents(req.params.widgetId);
        return res.status(200).json({ events });
    } catch (error) {
        console.error("Get planning events error:", error);
        return res.status(500).json({ message: "Impossible de charger les événements." });
    }
});

router.post("/", async (req, res) => {
    const validation = validateEvent(req.body);
    if (validation.error) {
        return res.status(400).json({ message: validation.error });
    }

    try {
        const event = await createPlanningEvent(req.params.widgetId, validation.value);
        return res.status(201).json({ message: "Événement créé.", event });
    } catch (error) {
        console.error("Create planning event error:", error);
        return res.status(500).json({ message: "Impossible de créer l'événement." });
    }
});

router.patch("/:eventId", async (req, res) => {
    const { eventId } = req.params;
    if (!isPositiveId(eventId)) {
        return res.status(400).json({ message: "Identifiant d'événement invalide." });
    }

    const validation = validateEvent(req.body);
    if (validation.error) {
        return res.status(400).json({ message: validation.error });
    }

    try {
        const event = await updatePlanningEvent(
            req.params.widgetId,
            eventId,
            validation.value
        );

        if (!event) {
            return res.status(404).json({ message: "Événement introuvable." });
        }

        return res.status(200).json({ message: "Événement modifié.", event });
    } catch (error) {
        console.error("Update planning event error:", error);
        return res.status(500).json({ message: "Impossible de modifier l'événement." });
    }
});

router.delete("/:eventId", async (req, res) => {
    const { eventId } = req.params;
    if (!isPositiveId(eventId)) {
        return res.status(400).json({ message: "Identifiant d'événement invalide." });
    }

    try {
        const deleted = await deletePlanningEvent(req.params.widgetId, eventId);
        if (!deleted) {
            return res.status(404).json({ message: "Événement introuvable." });
        }

        return res.status(200).json({ message: "Événement supprimé." });
    } catch (error) {
        console.error("Delete planning event error:", error);
        return res.status(500).json({ message: "Impossible de supprimer l'événement." });
    }
});

module.exports = router;