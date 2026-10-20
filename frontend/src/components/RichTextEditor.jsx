import { useEffect, useRef, useState } from 'react';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import {
  FaBold, FaItalic, FaUnderline, FaListUl, FaListOl, FaQuoteRight,
  FaLink, FaUnlink, FaImage, FaUndo, FaRedo, FaMinus,
} from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import { resizeImage } from '../utils/resizeImage.js';
import { toEditorHtml, fromEditorHtml } from '../utils/postContent.js';
import './RichTextEditor.css';

function ToolButton({ onClick, active, disabled, label, children }) {
  return (
    <button
      type="button"
      className={`rte-btn ${active ? 'is-active' : ''}`}
      onMouseDown={e => e.preventDefault()} // keep the text selection while clicking
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active ?? undefined}
      title={label}
    >
      {children}
    </button>
  );
}

/**
 * Formatting editor for post bodies.
 * `value` is the stored content (HTML, or legacy plain text); `onChange`
 * receives the HTML to store. `onError(message)` reports upload problems.
 */
export default function RichTextEditor({ value, onChange, onError }) {
  const fileInput = useRef(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Image.configure({ inline: false }),
    ],
    content: toEditorHtml(value),
    onUpdate: ({ editor: ed }) => onChange(fromEditorHtml(ed.getHTML())),
  });

  // Load new content when a different post is opened in the same editor.
  const lastValue = useRef(value);
  useEffect(() => {
    if (!editor || value === lastValue.current) return;
    lastValue.current = value;
    if (fromEditorHtml(editor.getHTML()) !== value) {
      editor.commands.setContent(toEditorHtml(value), { emitUpdate: false });
    }
  }, [value, editor]);

  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => ed && ({
      bold: ed.isActive('bold'),
      italic: ed.isActive('italic'),
      underline: ed.isActive('underline'),
      h2: ed.isActive('heading', { level: 2 }),
      h3: ed.isActive('heading', { level: 3 }),
      bullet: ed.isActive('bulletList'),
      ordered: ed.isActive('orderedList'),
      quote: ed.isActive('blockquote'),
      link: ed.isActive('link'),
      canUndo: ed.can().undo(),
      canRedo: ed.can().redo(),
    }),
  });

  if (!editor || !state) return <div className="rte rte-loading" />;

  const chain = () => editor.chain().focus();

  function setLink() {
    const previous = editor.getAttributes('link').href || '';
    const url = window.prompt('Link address (leave empty to remove the link):', previous || 'https://');
    if (url === null) return;
    if (url.trim() === '' || url.trim() === 'https://') {
      chain().extendMarkRange('link').unsetLink().run();
      return;
    }
    chain().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  async function insertImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', await resizeImage(file));
      const res = await api.post('/admin/upload_image.php', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const alt = window.prompt('Short description of the photo (helps screen readers and search):', '') || '';
      chain().setImage({ src: assetUrl(res.data.path), alt }).run();
    } catch (err) {
      onError?.(err.response?.data?.message || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        <div className="rte-group">
          <ToolButton label="Paragraph" active={!state.h2 && !state.h3} onClick={() => chain().setParagraph().run()}><span className="rte-text">P</span></ToolButton>
          <ToolButton label="Heading" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}><span className="rte-text">H2</span></ToolButton>
          <ToolButton label="Subheading" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}><span className="rte-text">H3</span></ToolButton>
        </div>
        <div className="rte-group">
          <ToolButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}><FaBold /></ToolButton>
          <ToolButton label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}><FaItalic /></ToolButton>
          <ToolButton label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}><FaUnderline /></ToolButton>
        </div>
        <div className="rte-group">
          <ToolButton label="Bulleted list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}><FaListUl /></ToolButton>
          <ToolButton label="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}><FaListOl /></ToolButton>
          <ToolButton label="Quote" active={state.quote} onClick={() => chain().toggleBlockquote().run()}><FaQuoteRight /></ToolButton>
          <ToolButton label="Divider line" onClick={() => chain().setHorizontalRule().run()}><FaMinus /></ToolButton>
        </div>
        <div className="rte-group">
          <ToolButton label={state.link ? 'Edit link' : 'Add link'} active={state.link} onClick={setLink}><FaLink /></ToolButton>
          {state.link && <ToolButton label="Remove link" onClick={() => chain().unsetLink().run()}><FaUnlink /></ToolButton>}
          <ToolButton label={uploading ? 'Uploading photo…' : 'Insert photo'} disabled={uploading} onClick={() => fileInput.current?.click()}><FaImage /></ToolButton>
          <input ref={fileInput} type="file" accept="image/png, image/jpeg, image/webp" hidden onChange={insertImage} />
        </div>
        <div className="rte-group rte-group-end">
          <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}><FaUndo /></ToolButton>
          <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}><FaRedo /></ToolButton>
        </div>
      </div>
      <EditorContent editor={editor} className="rte-content prose" />
      {uploading && <p className="rte-status">Uploading photo…</p>}
    </div>
  );
}
