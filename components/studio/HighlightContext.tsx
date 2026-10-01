'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

interface Ctx {
  /** 目前正在連動高亮的欄位 id */
  active: string | null;
  setActive: (id: string | null) => void;
  /** 被釘選（點擊鎖定）的欄位，滑鼠移開也不會消失 */
  pinned: string | null;
  togglePin: (id: string) => void;
  /** 剛剛被改動、正在閃光的欄位 */
  flashing: Record<string, number>;
  flash: (id: string) => void;
  /** 真正該高亮的 id（釘選優先於 hover） */
  resolved: string | null;
}

const HighlightCtx = createContext<Ctx | null>(null);

export function HighlightProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [flashing, setFlashing] = useState<Record<string, number>>({});
  const timers = useRef<Record<string, any>>({});

  const togglePin = useCallback((id: string) => {
    setPinned((p) => (p === id ? null : id));
  }, []);

  const flash = useCallback((id: string) => {
    setFlashing((f) => ({ ...f, [id]: (f[id] ?? 0) + 1 }));
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => {
      setFlashing((f) => {
        const n = { ...f };
        delete n[id];
        return n;
      });
    }, 1150);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ active, setActive, pinned, togglePin, flashing, flash, resolved: pinned ?? active }),
    [active, pinned, togglePin, flashing, flash]
  );

  return <HighlightCtx.Provider value={value}>{children}</HighlightCtx.Provider>;
}

export function useHighlight() {
  const ctx = useContext(HighlightCtx);
  if (!ctx) throw new Error('useHighlight must be used inside <HighlightProvider>');
  return ctx;
}
