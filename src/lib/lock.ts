// Verrou « doux » de la tablette familiale : qui a tapé le bon code, pour combien de temps.
// Rien de sensible ici (le parent est le seul compte authentifié) : l'état vit dans sessionStorage,
// il disparaît à la fermeture de l'onglet et est effacé dès qu'on revient au choix des profils.

export interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

const KEY = 'zoralia:unlocked';
export const PARENT_MINUTES = 15;

interface State { children: string[]; parentUntil: number }
const empty = (): State => ({ children: [], parentUntil: 0 });

function read(store: Store): State {
  try { return { ...empty(), ...(JSON.parse(store.getItem(KEY) ?? '{}') as Partial<State>) }; } catch { return empty(); }
}
function write(store: Store, s: State) {
  try { store.setItem(KEY, JSON.stringify(s)); } catch { /* stockage indisponible : l'accès se redemandera */ }
}

export function isChildUnlocked(store: Store, id: string): boolean { return read(store).children.includes(id); }
export function unlockChild(store: Store, id: string): void {
  const s = read(store);
  if (!s.children.includes(id)) write(store, { ...s, children: [...s.children, id] });
}
export function isParentUnlocked(store: Store, now: number = Date.now()): boolean { return read(store).parentUntil > now; }
export function unlockParent(store: Store, now: number = Date.now()): void {
  write(store, { ...read(store), parentUntil: now + PARENT_MINUTES * 60_000 });
}
export function lockAll(store: Store): void { try { store.removeItem(KEY); } catch { /* rien à faire */ } }

/** Vrai si le code saisi est complet (4 chiffres) : sert à déclencher la vérification toute seule. */
export const isCompletePin = (pin: string): boolean => /^[0-9]{4}$/.test(pin);

/** Stockage de l'onglet, ou un stockage en mémoire quand le navigateur le refuse. */
export function browserStore(): Store {
  try { window.sessionStorage.setItem('zoralia:probe', '1'); window.sessionStorage.removeItem('zoralia:probe'); return window.sessionStorage; }
  catch { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }; }
}
