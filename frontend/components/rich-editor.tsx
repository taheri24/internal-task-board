'use client';

import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor, type Editor, type JSONContent } from '@tiptap/react';
import { useEffect } from 'react';
import type { JSONNode } from '@/lib/types';

interface Props {
  value: JSONNode;
  onChange?: (doc: JSONNode) => void;
  readOnly?: boolean;
  label: string;
}

/** TipTap editor. Read-only mode renders the same JSON, so view and edit always match. */
export function RichEditor({ value, onChange, readOnly = false, label }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable: !readOnly,
    content: value as JSONContent,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        isAllowedUri: (url) => /^https?:\/\//i.test(url),
      }),
    ],
    onUpdate: ({ editor: e }) => onChange?.(e.getJSON() as JSONNode),
    editorProps: {
      attributes: {
        dir: 'rtl',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        class: 'prose-task min-h-[160px] px-4 py-3 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  return (
    <div className={`rounded-md border border-line bg-white ${readOnly ? 'bg-paper/50' : ''}`}>
      {editor && !readOnly && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const button = (label: string, active: boolean, run: () => void) => (
    <button
      key={label}
      type="button"
      aria-pressed={active}
      onClick={run}
      className={`rounded px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? 'bg-accent-soft font-semibold text-accent-ink' : 'text-muted hover:bg-paper hover:text-ink'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div role="toolbar" aria-label="قالب‌بندی متن" className="flex flex-wrap gap-1 border-b border-line bg-paper/60 p-1.5">
      {button('پررنگ', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
      {button('کج', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
      {button('عنوان', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
      {button('زیرعنوان', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
      {button('فهرست', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
      {button('فهرست شماره‌دار', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
      {button('نقل‌قول', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run())}
      {button('پیوند', editor.isActive('link'), () => setLink(editor))}
    </div>
  );
}

function setLink(editor: Editor) {
  const previous = (editor.getAttributes('link').href as string | undefined) ?? 'https://';
  const input = window.prompt('نشانی وب را وارد کنید (http یا https)', previous);
  if (input === null) return;

  const url = input.trim();
  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  if (!/^https?:\/\//i.test(url)) {
    window.alert('فقط نشانی‌های http و https مجاز هستند.');
    return;
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
}
