
const pool = require("../db/connection");

async function createWidget({
    boardId,
    type,
    posX = 0,
    posY = 0,
    width = 300,
    height = 200,
    zIndex = 0,
    data = {},
}) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const widgetResult = await client.query(
            `INSERT INTO widgets
                (board_id, type, pos_x, pos_y, width, height, z_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [boardId, type, posX, posY, width, height, zIndex]
        );

        const widget = widgetResult.rows[0];

        if (type === "postit") {
            await client.query(
                `INSERT INTO postit (widget_id, content, color)
                 VALUES ($1, $2, $3)`,
                [widget.widget_id, data.content ?? "", data.color ?? "yellow"]
            );
        } else if (type === "timer") {
            await client.query(
                `INSERT INTO timer (widget_id, label, duration_seconds)
                 VALUES ($1, $2, $3)`,
                [
                    widget.widget_id,
                    data.label ?? "Timer",
                    data.durationSeconds ?? 1500,
                ]
            );
        } else if (type === "planning") {
            // Un planning peut être créé sans événement.
            // Les événements seront ajoutés séparément.
        }

        await client.query("COMMIT");
        return getWidgetById(widget.widget_id, client);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getWidgetById(widgetId, db = pool) {
    const result = await db.query(
        `SELECT
            w.*,
            CASE
                WHEN w.type = 'postit' THEN (
                    SELECT json_build_object(
                        'content', p.content,
                        'color', p.color
                    )
                    FROM postit p
                    WHERE p.widget_id = w.widget_id
                )
                WHEN w.type = 'timer' THEN (
                    SELECT json_build_object(
                        'label', t.label,
                        'durationSeconds', t.duration_seconds,
                        'status', t.status,
                        'startedAt', t.started_at
                    )
                    FROM timer t
                    WHERE t.widget_id = w.widget_id
                )
                WHEN w.type = 'planning' THEN (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'eventId', e.event_id,
                                'title', e.title,
                                'startDate', e.start_date,
                                'endDate', e.end_date,
                                'description', e.description
                            )
                            ORDER BY e.start_date
                        ),
                        '[]'::json
                    )
                    FROM planning_event e
                    WHERE e.widget_id = w.widget_id
                )
            END AS data
         FROM widgets w
         WHERE w.widget_id = $1`,
        [widgetId]
    );

    return result.rows[0] ?? null;
}

async function getWidgetsByBoardId(boardId, db = pool) {
    const result = await db.query(
        `SELECT
            w.*,
            CASE
                WHEN w.type = 'postit' THEN (
                    SELECT json_build_object(
                        'content', p.content,
                        'color', p.color
                    )
                    FROM postit p
                    WHERE p.widget_id = w.widget_id
                )
                WHEN w.type = 'timer' THEN (
                    SELECT json_build_object(
                        'label', t.label,
                        'durationSeconds', t.duration_seconds,
                        'status', t.status,
                        'startedAt', t.started_at
                    )
                    FROM timer t
                    WHERE t.widget_id = w.widget_id
                )
                WHEN w.type = 'planning' THEN (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'eventId', e.event_id,
                                'title', e.title,
                                'startDate', e.start_date,
                                'endDate', e.end_date,
                                'description', e.description
                            )
                            ORDER BY e.start_date
                        ),
                        '[]'::json
                    )
                    FROM planning_event e
                    WHERE e.widget_id = w.widget_id
                )
            END AS data
         FROM widgets w
         WHERE w.board_id = $1
         ORDER BY w.z_index, w.widget_id`,
        [boardId]
    );

    return result.rows;
}

async function updateWidget(widgetId, fields) {
    const allowedFields = {
        posX: "pos_x",
        posY: "pos_y",
        width: "width",
        height: "height",
        zIndex: "z_index",
    };

    const updates = [];
    const values = [];
    let index = 1;

    for (const [key, column] of Object.entries(allowedFields)) {
        if (fields[key] !== undefined) {
            updates.push(`${column} = $${index}`);
            values.push(fields[key]);
            index += 1;
        }
    }

    if (updates.length === 0) {
        return getWidgetById(widgetId);
    }

    values.push(widgetId);

    const result = await pool.query(
        `UPDATE widgets
         SET ${updates.join(", ")}
         WHERE widget_id = $${index}
         RETURNING widget_id`,
        values
    );

    if (result.rowCount === 0) {
        return null;
    }

    return getWidgetById(widgetId);
}

async function deleteWidget(widgetId) {
    const result = await pool.query(
        `DELETE FROM widgets
         WHERE widget_id = $1
         RETURNING widget_id`,
        [widgetId]
    );

    return result.rows[0] ?? null;
}

module.exports = {
    createWidget,
    getWidgetById,
    getWidgetsByBoardId,
    updateWidget,
    deleteWidget,
};
