ALTER TABLE timer
ADD COLUMN remaining_seconds INTEGER NOT NULL DEFAULT 0
CHECK (remaining_seconds >= 0);

UPDATE timer
SET remaining_seconds = CASE
    WHEN status = 'completed' THEN 0
    ELSE duration_seconds
END;