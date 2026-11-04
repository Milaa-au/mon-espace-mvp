
import { useEffect, useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import WidgetContainer from "./WidgetContainer";
import "./PostItWidget.css";

function getPlainText(html) {
  const parsedContent = new DOMParser().parseFromString(html, "text/html");
  return parsedContent.body.textContent ?? "";
}

function getHtml(text) {
  const escapedText = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<p>${escapedText.replaceAll("\n", "<br>")}</p>`;
}

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
  // Repli sur un textarea si la clé manque ou si TinyMCE passe en lecture seule
  // (domaine non autorisé dans le tableau de bord TinyMCE).
  const [usePlainTextEditor, setUsePlainTextEditor] = useState(!tinyMceApiKey);
  const [plainText, setPlainText] = useState(() => getPlainText(content));

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setPlainText(getPlainText(content));
  }, [content]);

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

  function handlePlainTextChange(event) {
    const value = event.target.value;
    setPlainText(value);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onChangeRef.current?.(getHtml(value));
    }, 500);
  }

  function flushPlainTextSave(event) {
    clearTimeout(saveTimeout.current);
    onChangeRef.current?.(getHtml(event.target.value));
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
        {usePlainTextEditor ? (
          <textarea
            className="postit-editor__body"
            aria-label="Contenu du Post-it"
            placeholder="Écris ta note ici..."
            value={plainText}
            onChange={handlePlainTextChange}
            onBlur={flushPlainTextSave}
          />
        ) : (
          <Editor
            apiKey={tinyMceApiKey}
            initialValue={content}
            onInit={(_event, editor) => {
              if (editor.mode.isReadOnly()) setUsePlainTextEditor(true);
            }}
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
        )}
      </div>
    </WidgetContainer>
  );
}

export default PostItWidget;
