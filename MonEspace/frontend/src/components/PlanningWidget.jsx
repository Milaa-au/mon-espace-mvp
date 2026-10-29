import { useEffect, useState } from "react";
import WidgetContainer from "./WidgetContainer";
import "./PlanningWidget.css";

function PlanningWidget({
    id,
    title = "Mon planning",
    content = "",
    onChange,
    onDelete,
}) {
    const [text, setText] = useState(content);

    useEffect(() => {
        setText(content);
    }, [content]);

    function handleChange(event) {
        const newContent = event.target.value;
        setText(newContent);

        if (onChange) {
            onChange(newContent);
        }
    }

    return (
        <WidgetContainer
            title={title}
            type="planning"
            onDelete={onDelete ? () => onDelete(id) : undefined}
        >
            <textarea
                className="planning-widget__textarea"
                value={text}
                onChange={handleChange}
                placeholder="Organise ton planning ici..."
                aria-label="Contenu du planning"
            />
        </WidgetContainer>
    );
}

export default PlanningWidget;