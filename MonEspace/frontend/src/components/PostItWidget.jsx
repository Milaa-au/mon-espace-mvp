
import { useState, useEffect } from "react";
import WidgetContainer from "./WidgetContainer";
import "./PostItWidget.css";

function PostItWidget({
  id,
  title = "Mon Post-it",
  content = "",
  onChange,
  onDelete,
}) {
  const [text, setText] = useState(content);

  useEffect(() => {
    setText(content);
  }, [content]);

  function handleChange(event) {
    const newText = event.target.value;
    setText(newText);

    if (onChange) {
      onChange(newText);
    }
  }

  return (
    <WidgetContainer
      title={title}
      type="postit"
      onDelete={onDelete ? () => onDelete(id) : undefined}
    >
      <textarea
        className="postit-widget__textarea"
        value={text}
        onChange={handleChange}
        placeholder="Écris ta note ici..."
        aria-label="Contenu du Post-it"
      />
    </WidgetContainer>
  );
}

export default PostItWidget;
