import { useEffect, useId, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import "./WidgetContainer.css";

function WidgetContainer({
    title = "Widget",
    type = "default",
    id,
    position = { x: 24, y: 24 },
    width = 320,
    height = 240,
    children,
    onDelete,
    onResize,
    className = "",
    style = {},
}) {
    const generatedId = useId();
    const draggableId = id ?? generatedId;
    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
    } = useDraggable({ id: draggableId });
    const [size, setSize] = useState({ width, height });
    const resizeStart = useRef(null);
    const widgetClass = `widget-container widget-container--${type} ${className}`
        .trim();
    const widgetStyle = {
        ...style,
        position: "absolute",
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        maxWidth: "calc(100vw - 32px)",
        transform: CSS.Transform.toString(transform),
        transition,
    };

    useEffect(() => {
        setSize({ width, height });
    }, [width, height]);

    function handleResizeStart(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        resizeStart.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            width: size.width,
            height: size.height,
        };
    }

    function handleResizeMove(event) {
        if (!resizeStart.current) return;

        const bounds = resizeStart.current;
        setSize({
            width: Math.max(240, Math.min(window.innerWidth - 32, bounds.width + event.clientX - bounds.x)),
            height: Math.max(180, Math.min(window.innerHeight, bounds.height + event.clientY - bounds.y)),
        });
    }

    function handleResizeEnd(event) {
        if (!resizeStart.current) return;

        resizeStart.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        onResize?.(id, size);
    }

    return (
        <section ref={setNodeRef} className={widgetClass} style={widgetStyle}>
            <header className="widget-container__header">
                <h2 className="widget-container__title">{title}</h2>

                <button
                    ref={setActivatorNodeRef}
                    type="button"
                    className="widget-container__drag"
                    aria-label={`Déplacer ${title}`}
                    title="Déplacer le widget"
                    {...attributes}
                    {...listeners}
                >
                    ⠿
                </button>

                {onDelete && (
                    <button
                        type="button"
                        className="widget-container__delete"
                        onClick={onDelete}
                        aria-label={`Supprimer ${title}`}
                        title="Supprimer le widget"
                    >
                        ×
                    </button>
                )}
            </header>

            <div className="widget-container__content">
                {children}
            </div>

            <button
                type="button"
                className="widget-container__resize"
                aria-label={`Redimensionner ${title}`}
                title="Redimensionner le widget"
                onPointerDown={handleResizeStart}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                onPointerCancel={handleResizeEnd}
            >
                ⠿
            </button>
        </section>
    );
}

export default WidgetContainer;