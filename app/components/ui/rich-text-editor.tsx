import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon } from 'lucide-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    className?: string;
    toolbarPosition?: 'top' | 'bottom' | 'none';
    onEditorReady?: (editor: any) => void;
}

const RichTextEditor = ({ content, onChange, placeholder = 'Type here...', className = '', toolbarPosition = 'top', onEditorReady }: RichTextEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:pointer-events-none before:h-0',
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[64px] px-2 py-1 text-sm',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Only update if the content is different to avoid cursor jumping
            // But for simple "clear" operations (content === ''), this is fine.
            if (content === '') {
                editor.commands.setContent('');
            }
        }
    }, [content, editor]);

    useEffect(() => {
        if (editor && onEditorReady) {
            onEditorReady(editor);
        }
    }, [editor, onEditorReady]);

    if (!editor) {
        return null;
    }

    return (
        <div className={`border rounded-md border-input bg-transparent shadow-sm w-full ${className}`}>
            {toolbarPosition === 'top' && (
                <div className="flex items-center gap-1 p-1 border-b bg-muted/20">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        disabled={!editor.can().chain().focus().toggleBold().run()}
                        className={`p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('bold') ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        disabled={!editor.can().chain().focus().toggleItalic().run()}
                        className={`p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('italic') ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        disabled={!editor.can().chain().focus().toggleUnderline().run()}
                        className={`p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('underline') ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                        title="Underline"
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
            <EditorContent editor={editor} className="w-full" />
            {toolbarPosition === 'bottom' && (
                <div className="flex items-center gap-1 p-1 border-t bg-muted/20">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        disabled={!editor.can().chain().focus().toggleBold().run()}
                        className={`p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('bold') ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        disabled={!editor.can().chain().focus().toggleItalic().run()}
                        className={`p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('italic') ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        disabled={!editor.can().chain().focus().toggleUnderline().run()}
                        className={`p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('underline') ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                        title="Underline"
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default RichTextEditor;
