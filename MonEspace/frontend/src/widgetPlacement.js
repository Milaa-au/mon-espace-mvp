const MARGIN = 24;
const GAP = 24;

export function dashboardCanvasWidth() {
    const padding = Math.max(20, Math.min(window.innerWidth * 0.06, 88));
    return Math.max(320, Math.min(1200, window.innerWidth - 2 * padding));
}

export function constrainWidgetSize(widget, widgets, desiredSize, currentSize, viewportWidth) {
    const x = widget.posX ?? 0;
    const y = widget.posY ?? 0;
    const neighbors = widgets.filter((item) => item.id !== widget.id).map((item) => ({
        x: item.posX ?? 0,
        y: item.posY ?? 0,
        width: Math.min(item.width, viewportWidth - 32),
        height: item.height,
    }));

    let width = Math.min(desiredSize.width, currentSize.width);
    let height = Math.min(desiredSize.height, currentSize.height);

    if (desiredSize.width > width) {
        let limit = desiredSize.width;
        for (const other of neighbors) {
            if (y < other.y + other.height && y + height > other.y && x < other.x + other.width) {
                limit = Math.min(limit, other.x >= x + width ? other.x - x : width);
            }
        }
        width = Math.max(width, limit);
    }

    if (desiredSize.height > height) {
        let limit = desiredSize.height;
        for (const other of neighbors) {
            if (x < other.x + other.width && x + width > other.x && y < other.y + other.height) {
                limit = Math.min(limit, other.y >= y + height ? other.y - y : height);
            }
        }
        height = Math.max(height, limit);
    }

    return { width, height };
}

export function findWidgetPosition(widgets, width, height, canvasWidth) {
    const renderedWidth = Math.min(width, window.innerWidth - 32);
    const rectangles = widgets.map((widget) => ({
        x: widget.posX ?? widget.pos_x ?? 0,
        y: widget.posY ?? widget.pos_y ?? 0,
        width: Math.min(widget.width, window.innerWidth - 32),
        height: widget.height,
    }));
    const xs = [MARGIN, ...rectangles.map((item) => item.x + item.width + GAP)];
    const ys = [MARGIN, ...rectangles.map((item) => item.y + item.height + GAP)];
    const maxWidth = Math.max(canvasWidth, renderedWidth + MARGIN * 2);

    for (const y of [...new Set(ys)].sort((a, b) => a - b)) {
        for (const x of [...new Set(xs)].sort((a, b) => a - b)) {
            if (x + renderedWidth + MARGIN > maxWidth) continue;
            const overlaps = rectangles.some((item) =>
                x < item.x + item.width + GAP &&
                x + renderedWidth + GAP > item.x &&
                y < item.y + item.height + GAP &&
                y + height + GAP > item.y
            );
            if (!overlaps) return { posX: x, posY: y };
        }
    }

    return {
        posX: MARGIN,
        posY: Math.max(MARGIN, ...rectangles.map((item) => item.y + item.height + GAP)),
    };
}
