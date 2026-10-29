const pool = require("../db/connection");

const EVENT_FIELDS = `
    event_id AS "eventId",
    title,
    start_date AS "startDate",
    end_date AS "endDate",
    description`;

async function getPlanningEvents(widgetId) {
    const result = await pool.query(
        `SELECT ${EVENT_FIELDS}
         FROM planning_event
         WHERE widget_id = $1
         ORDER BY start_date, event_id`,
        [widgetId]
    );

    return result.rows;
}

async function createPlanningEvent(widgetId, event) {
    const result = await pool.query(
        `INSERT INTO planning_event
            (widget_id, title, start_date, end_date, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${EVENT_FIELDS}`,
        [widgetId, event.title, event.startDate, event.endDate, event.description]
    );

    return result.rows[0];
}

async function updatePlanningEvent(widgetId, eventId, event) {
    const result = await pool.query(
        `UPDATE planning_event
         SET title = $3,
             start_date = $4,
             end_date = $5,
             description = $6
         WHERE widget_id = $1 AND event_id = $2
         RETURNING ${EVENT_FIELDS}`,
        [widgetId, eventId, event.title, event.startDate, event.endDate, event.description]
    );

    return result.rows[0] ?? null;
}

async function deletePlanningEvent(widgetId, eventId) {
    const result = await pool.query(
        `DELETE FROM planning_event
         WHERE widget_id = $1 AND event_id = $2
         RETURNING event_id AS "eventId"`,
        [widgetId, eventId]
    );

    return result.rows[0] ?? null;
}

module.exports = {
    getPlanningEvents,
    createPlanningEvent,
    updatePlanningEvent,
    deletePlanningEvent,
};