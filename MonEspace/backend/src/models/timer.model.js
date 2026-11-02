const pool = require("../db/connection");

const TIMER_FIELDS = `
    widget_id AS "widgetId",
    label,
    duration_seconds AS "durationSeconds",
    remaining_seconds AS "remainingSeconds",
    status,
    started_at AS "startedAt"`;

async function getTimer(widgetId) {
    await pool.query(
        `UPDATE timer
         SET status = 'completed', remaining_seconds = 0, started_at = NULL
         WHERE widget_id = $1
           AND status = 'running'
           AND remaining_seconds <= FLOOR(
               EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))
           )`,
        [widgetId]
    );

    const result = await pool.query(
        `SELECT ${TIMER_FIELDS}
         FROM timer
         WHERE widget_id = $1`,
        [widgetId]
    );

    return result.rows[0] ?? null;
}

async function setTimerDuration(widgetId, durationSeconds) {
    const result = await pool.query(
        `UPDATE timer
         SET duration_seconds = $2,
             remaining_seconds = $2,
             status = 'idle',
             started_at = NULL
         WHERE widget_id = $1 AND status <> 'running'
         RETURNING widget_id`,
        [widgetId, durationSeconds]
    );

    return result.rowCount > 0 ? getTimer(widgetId) : null;
}

async function startTimer(widgetId) {
    const result = await pool.query(
        `UPDATE timer
         SET status = 'running', started_at = CURRENT_TIMESTAMP
         WHERE widget_id = $1
           AND status IN ('idle', 'paused')
           AND remaining_seconds > 0
         RETURNING widget_id`,
        [widgetId]
    );

    return result.rowCount > 0 ? getTimer(widgetId) : null;
}

async function pauseTimer(widgetId) {
    const result = await pool.query(
        `UPDATE timer
         SET remaining_seconds = GREATEST(
                 0,
                 remaining_seconds - FLOOR(
                     EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))
                 )::INTEGER
             ),
             status = CASE
                 WHEN remaining_seconds <= FLOOR(
                     EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))
                 ) THEN 'completed'
                 ELSE 'paused'
             END,
             started_at = NULL
         WHERE widget_id = $1 AND status = 'running'
         RETURNING widget_id`,
        [widgetId]
    );

    return result.rowCount > 0 ? getTimer(widgetId) : null;
}

async function resetTimer(widgetId) {
    const result = await pool.query(
        `UPDATE timer
         SET remaining_seconds = duration_seconds,
             status = 'idle',
             started_at = NULL
         WHERE widget_id = $1
         RETURNING widget_id`,
        [widgetId]
    );

    return result.rowCount > 0 ? getTimer(widgetId) : null;
}

module.exports = {
    getTimer,
    setTimerDuration,
    startTimer,
    pauseTimer,
    resetTimer,
};