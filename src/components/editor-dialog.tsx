"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function EditorDialog({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    const dialog = ref.current;
    return () => {
      dialog?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`editor-dialog${wide ? " wide" : ""}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="editor-dialog-heading">
        <h2>{title}</h2>
        <button
          type="button"
          className="button secondary"
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      {open && children}
    </dialog>
  );
}
