"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: "success" | "error" | "info";
  undoAction?: () => void;
  dismissing?: boolean;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  addToast: () => "",
  removeToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);

    const duration = toast.undoAction ? 8000 : toast.type === "error" ? 8000 : 5000;
    setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-ambient-lg min-w-[320px] max-w-[420px] ${
              toast.dismissing ? "animate-toast-out" : "animate-toast-in"
            } ${
              toast.type === "error"
                ? "bg-md-error_container text-md-error"
                : "bg-md-on_surface text-md-surface_container_lowest"
            }`}
          >
            {/* Icon */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              toast.type === "success" ? "bg-emerald-500/20" :
              toast.type === "error" ? "bg-md-error/20" : "bg-blue-500/20"
            }`}>
              {toast.type === "success" && (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === "error" && (
                <svg className="w-4 h-4 text-md-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === "info" && (
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.message && <p className="text-xs opacity-70 mt-0.5">{toast.message}</p>}
            </div>

            {/* Undo or close */}
            {toast.undoAction ? (
              <button
                onClick={() => {
                  toast.undoAction?.();
                  removeToast(toast.id);
                }}
                className="text-xs font-bold text-md-primary_container hover:opacity-80 transition-opacity flex-shrink-0 uppercase tracking-wide"
              >
                Undo
              </button>
            ) : (
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
