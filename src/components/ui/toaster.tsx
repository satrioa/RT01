"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

type Toast = { id: string; title: string; description?: string; variant?: "success" | "error" };

const ToastContext = React.createContext<{
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
} | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 mx-auto flex max-w-[430px] flex-col gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur",
              t.variant === "error" ? "border-destructive/30 bg-destructive text-destructive-foreground" : "border bg-card"
            )}
          >
            {t.variant === "error" ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-none">{t.title}</p>
              {t.description && <p className="mt-1 text-xs opacity-80">{t.description}</p>}
            </div>
            <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} className="shrink-0 opacity-60 hover:opacity-100">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
