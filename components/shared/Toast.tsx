"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastItem = { id: number; msg: string };
type ToastCtx = (msg: string) => void;

const Ctx = createContext<ToastCtx>(() => {});

// Lightweight toast provider. Call useToast() to push transient messages.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, msg }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[88px] z-[95] flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="anim-toast max-w-sm rounded-lg border border-border bg-surface2 px-4 py-2 text-sm text-ink shadow-lg"
          >
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  return useContext(Ctx);
}
