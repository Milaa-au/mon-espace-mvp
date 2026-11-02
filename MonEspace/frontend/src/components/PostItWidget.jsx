
import { useEffect, useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
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
  const saveTimeout = useRef(null);
  const onChangeRef = useRef(onChange);
  const tinyMceApiKey = import.meta.env.VITE_TINYMCE_API_KEY;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => () => clearTimeout(saveTimeout.current), []);

  function handleEditorChange(html) {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onChangeRef.current?.(html);
    }, 500);
  }

  function flushSave(_event, editor) {
    clearTimeout(saveTimeout.current);
    onChangeRef.current?.(editor.getContent());
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
      <div className="postit-editor">
        {!tinyMceApiKey && (
          <p className="postit-editor__config-warning" role="status">
            Configure VITE_TINYMCE_API_KEY dans .env.local pour activer l’édition.
          </p>
        )}
        <Editor
          apiKey={tinyMceApiKey || "no-api-key"}
          initialValue={content}
          onEditorChange={handleEditorChange}
          onBlur={flushSave}
          init={{
            height: "100%",
            menubar: false,
            statusbar: false,
            resize: false,
            placeholder: "Écris ta note ici...",
            plugins: "lists link",
            toolbar: "undo redo | bold italic | fontfamily fontsize | bullist numlist | removeformat",
            toolbar_mode: "sliding",
            font_family_formats: "DM Sans=dm sans,sans-serif; Georgia=georgia,serif; Arial=arial,sans-serif; Monospace=monospace",
            font_size_formats: "14px 16px 20px 24px 30px",
            content_style: "body { font-family: 'DM Sans', sans-serif; font-size: 16px; color: #422006; background: transparent; }",
          }}
        />
      </div>
    </WidgetContainer>
  );
}

export default PostItWidget;
