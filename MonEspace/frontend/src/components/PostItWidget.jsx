
import { useEffect, useState } from "react";
import WidgetContainer from "./WidgetContainer";
import "./PostItWidget.css";

function PostItWidget({
  id,
  position,
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
    const newContent = event.target.value;

    setText(newContent);

    if (onChange) {
      onChange(id, newContent);
    }
  }

  return (
    <WidgetContainer
      title={title}
      type="postit"
      id={id}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: 280,
      }}
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
