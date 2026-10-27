import "./WidgetContainer.css";

function WidgetContainer({
    title = "Widget",
    type = "default",
    children,
    onDelete,
    className = "",
    style = {},
}) {
    const widgetClass = `widget-container widget-container--${type} ${className}`
        .trim();

    return (
        <section className={widgetClass} style={style}>
            <header className="widget-container__header">
                <h2 className="widget-container__title">{title}</h2>

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
        </section>
    );
}

export default WidgetContainer;