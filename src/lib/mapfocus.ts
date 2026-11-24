// La liste « Les aventuriers » demande à la carte de défiler jusqu'à un enfant : un petit événement suffit,
// les deux composants ne se connaissent pas.
const EVENT = 'zoralia:focus-child';

export function focusChild(id: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: id }));
}

export function onFocusChild(fn: (id: string) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
