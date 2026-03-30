"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}

export default function Modal({ open, onClose, title, children, wide }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-md-on_surface/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`bg-md-surface_container_lowest rounded-2xl shadow-ambient-lg ${
          wide ? "w-full max-w-2xl" : "w-full max-w-md"
        } max-h-[80vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="headline-md text-md-on_surface">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-md-on_surface_variant hover:text-md-on_surface hover:bg-md-surface_container_high transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="px-6 pb-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
