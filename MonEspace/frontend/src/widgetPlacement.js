const MARGIN = 24;
const GAP = 24;

export function dashboardCanvasWidth() {
    const padding = Math.max(20, Math.min(window.innerWidth * 0.06, 88));
    return Math.max(320, Math.min(1200, window.innerWidth - 2 * padding));
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
