
import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
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

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      FontSize,
      Placeholder.configure({ placeholder: "Écris ta note ici..." }),
    ],
    content: content || "<p></p>",
    onUpdate: ({ editor: currentEditor }) => {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        onChangeRef.current?.(currentEditor.getHTML());
      }, 500);
    },
  });

  useEffect(() => {
    if (editor?.isInitialized && editor.getHTML() !== (content || "<p></p>")) {
      editor.commands.setContent(content || "<p></p>", { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => () => clearTimeout(saveTimeout.current), []);

  function flushSave() {
    if (!editor?.isInitialized) return;

    clearTimeout(saveTimeout.current);
    onChangeRef.current?.(editor.getHTML());
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
        <div className="postit-editor__toolbar" role="toolbar" aria-label="Mise en forme du Post-it">
          <button
            type="button"
            aria-label="Gras"
            aria-pressed={editor?.isActive("bold") ?? false}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            B
          </button>
          <button
            type="button"
            aria-label="Italique"
            aria-pressed={editor?.isActive("italic") ?? false}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <i>I</i>
          </button>
          <label>
            <span className="sr-only">Police</span>
            <select
              aria-label="Police"
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) {
                  editor?.chain().focus().setFontFamily(event.target.value).run();
                }
              }}
            >
              <option value="" disabled>Police</option>
              <option value="DM Sans">DM Sans</option>
              <option value="Georgia">Georgia</option>
              <option value="Arial">Arial</option>
              <option value="monospace">Monospace</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Taille du texte</span>
            <select
              aria-label="Taille du texte"
              defaultValue="16px"
              onChange={(event) =>
                editor?.chain().focus().setFontSize(event.target.value).run()
              }
            >
              <option value="14px">14</option>
              <option value="16px">16</option>
              <option value="20px">20</option>
              <option value="24px">24</option>
              <option value="30px">30</option>
            </select>
          </label>
        </div>
        <div className="postit-editor__body" onBlur={flushSave}>
          <EditorContent editor={editor} aria-label="Contenu du Post-it" />
        </div>
      </div>
    </WidgetContainer>
  );
}

export default PostItWidget;
