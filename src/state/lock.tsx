import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { browserStore, isChildUnlocked, isParentUnlocked, lockAll, unlockChild, unlockParent } from '../lib/lock';

interface LockCtx {
  childOpen: (id: string) => boolean;
  parentOpen: () => boolean;
  openChild: (id: string) => void;
  openParent: () => void;
  closeAll: () => void;
}
const Ctx = createContext<LockCtx | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const store = useMemo(browserStore, []);
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);
  const value = useMemo<LockCtx>(() => ({
    childOpen: (id) => isChildUnlocked(store, id),
    parentOpen: () => isParentUnlocked(store),
    openChild: (id) => { unlockChild(store, id); bump(); },
    openParent: () => { unlockParent(store); bump(); },
    closeAll: () => { lockAll(store); bump(); },
  }), [store, bump]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLock(): LockCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('LockProvider manquant');
  return v;
}
