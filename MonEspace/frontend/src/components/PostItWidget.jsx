
import { useEffect, useState } from "react";
import WidgetContainer from "./WidgetContainer";
import "./PostItWidget.css";

function PostItWidget({
  id,
  position,
  width,
  height,
  title = "Mon Post-it",
  content = "",
  onChange,
  onResize,
  onDelete,
}) {
  const [text, setText] = useState(content);

  useEffect(() => {
    setText(content);
  }, [content]);

  function handleChange(event) {
    const newText = event.target.value;
    setText(newText);
    onChange?.(newText);
  }

  return (
    <WidgetContainer
      title={title}
      type="postit"
      id={id}
      position={position}
      width={width}
      height={height}
      onResize={onResize}
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
