CREATE TABLE widgets (
    widget_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    board_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('postit', 'planning', 'timer')),
    pos_x INTEGER NOT NULL DEFAULT 0,
    pos_y INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 300 CHECK (width > 0),
    height INTEGER NOT NULL DEFAULT 200 CHECK (height > 0),
    z_index INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(board_id) ON DELETE CASCADE
);

CREATE TABLE postit (
    postit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    widget_id BIGINT NOT NULL UNIQUE,
    content TEXT NOT NULL DEFAULT '',
    color VARCHAR(30) NOT NULL DEFAULT 'yellow',
    FOREIGN KEY (widget_id) REFERENCES widgets(widget_id) ON DELETE CASCADE
);

CREATE TABLE planning_event (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    widget_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    description TEXT,
    CHECK (end_date IS NULL OR end_date >= start_date),
    FOREIGN KEY (widget_id) REFERENCES widgets(widget_id) ON DELETE CASCADE
);

CREATE TABLE timer (
    timer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    widget_id BIGINT NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL DEFAULT 'Timer',
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'idle'
        CHECK (status IN ('idle', 'running', 'paused', 'completed')),
    started_at TIMESTAMPTZ,
    FOREIGN KEY (widget_id) REFERENCES widgets(widget_id) ON DELETE CASCADE
);

CREATE FUNCTION update_widget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER widgets_updated_at
BEFORE UPDATE ON widgets
FOR EACH ROW
EXECUTE FUNCTION update_widget_updated_at();