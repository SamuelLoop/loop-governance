"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bold,
  Italic,
  UnderlineIcon,
  AlignLeft,
  AlignCenter,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Video,
  ImageIcon,
  Quote,
  Undo,
  Redo,
} from "lucide-react";

type Props = {
  content: any;
  onChange: (json: any) => void;
};

export function TiptapEditor({ content, onChange }: Props) {
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Youtube.configure({ width: 640, height: 360, allowFullscreen: true }),
      Placeholder.configure({ placeholder: "Start writing your campaign..." }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "tiptap-content prose prose-sm dark:prose-invert max-w-none min-h-[300px] p-4 outline-none focus:outline-none",
      },
    },
  });

  const addYoutube = useCallback(() => {
    if (!editor || !youtubeUrl) return;
    editor.commands.setYoutubeVideo({ src: youtubeUrl });
    setYoutubeUrl("");
    setShowYoutubeInput(false);
  }, [editor, youtubeUrl]);

  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    editor.chain().focus().setLink({ href: linkUrl }).run();
    setLinkUrl("");
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl("");
    setShowImageInput(false);
  }, [editor, imageUrl]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          onClick={() => setShowLinkInput(!showLinkInput)}
          active={showLinkInput || editor.isActive("link")}
          title="Add link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setShowImageInput(!showImageInput)}
          active={showImageInput}
          title="Add image"
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setShowYoutubeInput(!showYoutubeInput)}
          active={showYoutubeInput}
          title="Add YouTube video"
        >
          <Video className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          active={false}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          active={false}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Inline inputs */}
      {showYoutubeInput && (
        <div className="flex items-center gap-2 border-b bg-muted/20 p-2">
          <Input
            placeholder="https://youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && addYoutube()}
          />
          <Button size="sm" onClick={addYoutube} className="h-8 text-xs">
            Embed
          </Button>
        </div>
      )}
      {showLinkInput && (
        <div className="flex items-center gap-2 border-b bg-muted/20 p-2">
          <Input
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && addLink()}
          />
          <Button size="sm" onClick={addLink} className="h-8 text-xs">
            Add link
          </Button>
        </div>
      )}
      {showImageInput && (
        <div className="flex items-center gap-2 border-b bg-muted/20 p-2">
          <Input
            placeholder="Image URL..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && addImage()}
          />
          <Button size="sm" onClick={addImage} className="h-8 text-xs">
            Add image
          </Button>
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />

      <style>{`
        .tiptap-content h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; }
        .tiptap-content h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
        .tiptap-content p { margin-bottom: 0.75rem; }
        .tiptap-content ul, .tiptap-content ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .tiptap-content blockquote { border-left: 3px solid var(--border); padding-left: 1rem; margin-bottom: 0.75rem; font-style: italic; }
        .tiptap-content a { color: var(--primary); text-decoration: underline; }
        .tiptap-content img { max-width: 100%; border-radius: 0.5rem; margin: 1rem 0; }
        .tiptap-content iframe { max-width: 100%; border-radius: 0.5rem; margin: 1rem 0; }
        .tiptap-content .ProseMirror-focused { outline: none; }
        .tiptap-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--muted-foreground);
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
