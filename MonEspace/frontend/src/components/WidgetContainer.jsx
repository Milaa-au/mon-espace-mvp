import { useId } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import "./WidgetContainer.css";

function WidgetContainer({
    title = "Widget",
    type = "default",
    id,
    children,
    onDelete,
    className = "",
    style = {},
}) {
    const draggableId = id ?? useId();
    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
    } = useDraggable({ id: draggableId });
    const widgetClass = `widget-container widget-container--${type} ${className}`
        .trim();
    const widgetStyle = {
        ...style,
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <section ref={setNodeRef} className={widgetClass} style={widgetStyle}>
            <header
                className="widget-container__header"
            >
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
                        onPointerDown={(event) => event.stopPropagation()}
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
        </section>
    );
}

export default WidgetContainer;