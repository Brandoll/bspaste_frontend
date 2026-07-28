'use client';

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import {
  Bold,
  Check,
  Code,
  Copy,
  FilePlus2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Radio,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { useLiveShare } from '@/hooks/useLiveShare';
import { cn } from '@/lib/utils';
import { usePasteStore } from '@/stores/usePasteStore';

const lowlight = createLowlight(common);
const subscribeToHydration = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const MAX_ASSET_BYTES = 10 * 1024 * 1024;

interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({ label, onClick, active, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground',
        active && 'bg-accent text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export function MainEditor() {
  const isMounted = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isMounted) {
    return <div className="min-h-[560px] flex-1 bg-muted/20" aria-hidden="true" />;
  }

  return <MountedEditor />;
}

function MountedEditor() {
  const {
    setContent,
    content,
    mode,
    liveSession,
    pendingAssets,
    addPendingAssets,
    removePendingAsset,
  } = usePasteStore();
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isConnected, isLive, presenceCount, emitUpdate } = useLiveShare();

  const acceptFiles = useCallback((files: File[]) => {
    const accepted = files.filter((file) => {
      if (file.size > MAX_ASSET_BYTES) {
        toast.error(`${file.name} supera el límite de 10 MB`);
        return false;
      }
      return true;
    });
    if (accepted.length > 0) {
      addPendingAssets(accepted);
      toast.success(
        accepted.length === 1
          ? 'Archivo preparado para cifrar y subir'
          : `${accepted.length} archivos preparados`,
      );
    }
  }, [addPendingAssets]);

  useEffect(() => {
    if (mode !== 'create') return;
    const handleWindowPaste = (event: ClipboardEvent) => {
      const itemImages = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      const images = itemImages.length > 0
        ? itemImages
        : Array.from(event.clipboardData?.files ?? []).filter((file) =>
            file.type.startsWith('image/'),
          );
      if (images.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      acceptFiles(images);
    };

    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files');
    const handleDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setDragging(true);
    };
    const handleDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const handleDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setDragging(false);
    };
    const handleDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current = 0;
      setDragging(false);
      acceptFiles(Array.from(event.dataTransfer?.files ?? []));
    };

    window.addEventListener('paste', handleWindowPaste, true);
    window.addEventListener('dragenter', handleDragEnter, true);
    window.addEventListener('dragover', handleDragOver, true);
    window.addEventListener('dragleave', handleDragLeave, true);
    window.addEventListener('drop', handleDrop, true);
    return () => {
      window.removeEventListener('paste', handleWindowPaste, true);
      window.removeEventListener('dragenter', handleDragEnter, true);
      window.removeEventListener('dragover', handleDragOver, true);
      window.removeEventListener('dragleave', handleDragLeave, true);
      window.removeEventListener('drop', handleDrop, true);
    };
  }, [acceptFiles, mode]);

  const editor = useEditor({
    immediatelyRender: true,
    editable: mode !== 'read' || Boolean(liveSession?.editorToken),
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: content || '',
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      setContent(html);
      emitUpdate(html);
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[360px]',
      },
    },
  });

  useEffect(() => {
    if (editor && content && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [editor, content]);

  useEffect(() => {
    editor?.setEditable(mode !== 'read' || Boolean(liveSession?.editorToken));
  }, [editor, liveSession?.editorToken, mode]);

  if (!editor) return null;

  const isReadOnly = mode === 'read' && !liveSession?.editorToken;

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-muted/20">
      {dragging && mode === 'create' && (
        <div className="pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-background/90 shadow-2xl backdrop-blur-sm">
          <div className="text-center">
            <UploadCloud className="mx-auto mb-3 text-primary" size={34} />
            <p className="font-semibold">Suelta para adjuntar</p>
            <p className="mt-1 text-sm text-muted-foreground">El archivo se cifrará antes de subirlo.</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-5 py-4 sm:min-h-20 sm:px-7">
        <div>
          <p className="text-sm font-semibold">
            {mode === 'create' ? 'Nuevo paste cifrado' : 'Contenido descifrado'}
          </p>
          <p className="text-xs text-muted-foreground">
            El contenido se cifra en este dispositivo antes de enviarse.
          </p>
        </div>
        <div className={cn('flex items-center gap-2 text-xs font-medium', isLive ? 'text-blue-600' : 'text-emerald-600')}>
          {isLive ? <Radio size={15} /> : <Check size={15} />}
          {isLive
            ? isConnected
              ? `Live conectado · ${presenceCount} dispositivo(s)`
              : 'Conectando Live…'
            : 'Cifrado local'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-7">
        <div className="overflow-hidden rounded-[1.25rem] border bg-background">
          {!isReadOnly && (
            <div className="flex flex-wrap items-center gap-1 border-b p-2">
              <ToolbarButton label="Negrita" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold size={16} /></ToolbarButton>
              <ToolbarButton label="Cursiva" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic size={16} /></ToolbarButton>
              <ToolbarButton
                label="Enlace"
                onClick={() => {
                  const url = window.prompt('URL del enlace');
                  if (url) editor.chain().focus().setLink({ href: url }).run();
                }}
              ><LinkIcon size={16} /></ToolbarButton>
              <span className="mx-1 h-5 w-px bg-border" />
              <ToolbarButton label="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List size={16} /></ToolbarButton>
              <ToolbarButton label="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered size={16} /></ToolbarButton>
              <ToolbarButton label="Código" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}><Code size={16} /></ToolbarButton>
              <ToolbarButton label="Cita" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote size={16} /></ToolbarButton>
              <span className="flex-1" />
              <ToolbarButton label="Adjuntar archivo" onClick={() => fileInputRef.current?.click()}><FilePlus2 size={16} /></ToolbarButton>
            </div>
          )}

          <div className="relative p-4 sm:p-6">
            <EditorContent editor={editor} />
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(editor.getText());
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
              className="absolute right-3 top-3 rounded-md border bg-background p-2 text-muted-foreground shadow-sm hover:text-foreground"
              aria-label="Copiar contenido"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {mode === 'create' && (
          <div
            className={cn(
              'mt-4 rounded-2xl border border-dashed bg-background p-6 transition',
              dragging && 'border-primary bg-primary/5',
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.txt,.md,.json,.sql,.log,.env,.yml,.yaml,.toml"
              className="hidden"
              onChange={(event) => {
                acceptFiles(Array.from(event.target.files ?? []));
                event.target.value = '';
              }}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mx-auto flex flex-col items-center text-center">
              <UploadCloud className="mb-2 text-primary" size={26} />
              <span className="text-sm font-medium">Arrastra archivos o selecciónalos</span>
              <span className="mt-1 text-xs text-muted-foreground">También puedes pegar imágenes con Ctrl + V · máximo 10 MB</span>
            </button>

            {pendingAssets.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {pendingAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 rounded-xl border bg-muted/30 p-2">
                    {asset.file.type.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.previewUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted"><FilePlus2 size={19} /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{asset.file.name}</p>
                      <p className="text-[11px] text-muted-foreground">{(asset.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" aria-label={`Quitar ${asset.file.name}`} onClick={() => removePendingAsset(asset.id)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
