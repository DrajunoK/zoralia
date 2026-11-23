// PWA : enregistrement du service worker (public/sw.js) et logique d'installation de l'appli.

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'none';

/** Quoi proposer pour installer l'appli : rien si elle l'est déjà, le bouton natif si le navigateur le permet, sinon l'aide iPhone. */
export function installMode(s: { standalone: boolean; hasPrompt: boolean; ios: boolean }): InstallMode {
  if (s.standalone) return 'installed';
  if (s.hasPrompt) return 'prompt';
  if (s.ios) return 'ios';
  return 'none';
}

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function currentInstallMode(): InstallMode {
  return installMode({ standalone: isStandalone(), hasPrompt: deferred !== null, ios: isIos() });
}

export function subscribeInstall(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Ouvre la fenêtre d'installation du navigateur (Chrome, Edge, Android). */
export async function promptInstall(): Promise<void> {
  if (!deferred) return;
  const ev = deferred;
  deferred = null;
  notify();
  await ev.prompt();
  await ev.userChoice.catch(() => undefined);
}

/** À appeler une fois au démarrage : écoute l'invitation d'installation et branche le service worker. */
export function setupPwa(): void {
  // Le navigateur envoie cet événement très tôt : on le garde pour le bouton « Installer l'appli ».
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BeforeInstallPromptEvent; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });

  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  const hadController = navigator.serviceWorker.controller !== null;
  let reloaded = false;
  // Une nouvelle version prend la main : on recharge une seule fois (sauf à la toute première installation).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => undefined); });
}
