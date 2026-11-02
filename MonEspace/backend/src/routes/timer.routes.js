const express = require("express");
const pool = require("../db/connection");
const authMiddleware = require("../middleware/auth");
const {
    getTimer,
    setTimerDuration,
    startTimer,
    pauseTimer,
    resetTimer,
} = require("../models/timer.model");

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

function isPositiveId(value) {
    return /^[1-9]\d*$/.test(value);
}

router.use(async (req, res, next) => {
    const { widgetId } = req.params;

    if (!isPositiveId(widgetId)) {
        return res.status(400).json({ message: "Identifiant de timer invalide." });
    }

    try {
        const result = await pool.query(
            `SELECT w.widget_id
             FROM widgets w
             JOIN boards b ON b.board_id = w.board_id
             WHERE w.widget_id = $1
               AND w.type = 'timer'
               AND b.user_id = $2`,
            [widgetId, req.user.userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Timer introuvable." });
        }

        return next();
    } catch (error) {
        console.error("Timer ownership error:", error);
        return res.status(500).json({ message: "Impossible de vérifier le timer." });
    }
});

router.get("/", async (req, res) => {
    try {
        const timer = await getTimer(req.params.widgetId);
        return res.status(200).json({ timer });
    } catch (error) {
        console.error("Get timer error:", error);
        return res.status(500).json({ message: "Impossible de charger le timer." });
    }
});

router.patch("/duration", async (req, res) => {
    const { durationSeconds } = req.body ?? {};
    if (!Number.isSafeInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 604800) {
        return res.status(400).json({
            message: "La durée doit être comprise entre 1 seconde et 7 jours.",
        });
    }

    try {
        const timer = await setTimerDuration(req.params.widgetId, durationSeconds);
        if (!timer) {
            return res.status(409).json({ message: "Mets le timer en pause avant de changer sa durée." });
        }

        return res.status(200).json({ message: "Durée enregistrée.", timer });
    } catch (error) {
        console.error("Set timer duration error:", error);
        return res.status(500).json({ message: "Impossible de modifier la durée." });
    }
});

router.post("/start", async (req, res) => {
    try {
        let timer = await startTimer(req.params.widgetId);
        if (!timer) {
            timer = await getTimer(req.params.widgetId);
            if (timer?.status === "running") {
                return res.status(200).json({ timer });
            }
            return res.status(409).json({ message: "Réinitialise le timer avant de le démarrer." });
        }

        return res.status(200).json({ message: "Timer démarré.", timer });
    } catch (error) {
        console.error("Start timer error:", error);
        return res.status(500).json({ message: "Impossible de démarrer le timer." });
    }
});

router.post("/pause", async (req, res) => {
    try {
        const timer = await pauseTimer(req.params.widgetId);
        if (!timer) {
            return res.status(409).json({ message: "Le timer n'est pas en cours." });
        }

        return res.status(200).json({ message: "Timer mis en pause.", timer });
    } catch (error) {
        console.error("Pause timer error:", error);
        return res.status(500).json({ message: "Impossible de mettre le timer en pause." });
    }
});

router.post("/reset", async (req, res) => {
    try {
        const timer = await resetTimer(req.params.widgetId);
        if (!timer) {
            return res.status(404).json({ message: "Timer introuvable." });
        }

        return res.status(200).json({ message: "Timer réinitialisé.", timer });
    } catch (error) {
        console.error("Reset timer error:", error);
        return res.status(500).json({ message: "Impossible de réinitialiser le timer." });
    }
});

module.exports = router;