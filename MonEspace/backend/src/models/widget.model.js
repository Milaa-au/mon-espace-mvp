
const pool = require("../db/connection");

// Créer un widget et ses données spécifiques.
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

        const result = await client.query(
            `INSERT INTO widgets
                (board_id, type, pos_x, pos_y, width, height, z_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING widget_id`,
            [boardId, type, posX, posY, width, height, zIndex]
        );

        const widgetId = result.rows[0].widget_id;

        if (type === "postit") {
            await client.query(
                `INSERT INTO postit (widget_id, content, color)
                 VALUES ($1, $2, $3)`,
                [widgetId, data.content ?? "", data.color ?? "yellow"]
            );
        } else if (type === "timer") {
            await client.query(
                `INSERT INTO timer (widget_id, label, duration_seconds)
                 VALUES ($1, $2, $3)`,
                [
                    widgetId,
                    data.label ?? "Timer",
                    data.durationSeconds ?? 1500,
                ]
            );
        }

        await client.query("COMMIT");
        return await getWidgetById(widgetId);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

// Récupérer un widget et ses données associées.
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

// Récupérer tous les widgets d'un tableau.
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

// Modifier la position et les dimensions d'un widget.
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

    for (const [key, column] of Object.entries(allowedFields)) {
        if (fields[key] !== undefined) {
            values.push(fields[key]);
            updates.push(`${column} = $${values.length}`);
        }
    }

    if (updates.length === 0) {
        return null;
    }

    values.push(widgetId);

    const result = await pool.query(
        `UPDATE widgets
         SET ${updates.join(", ")}
         WHERE widget_id = $${values.length}
         RETURNING widget_id`,
        values
    );

    if (result.rowCount === 0) {
        return null;
    }

    return getWidgetById(widgetId);
}

// Supprimer un widget.
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
