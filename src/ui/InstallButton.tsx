import { useEffect, useState, useSyncExternalStore } from 'react';
import { currentInstallMode, promptInstall, subscribeInstall } from '../lib/pwa';

/** « Installer l'appli » : bouton natif sur Chrome et Android, mode d'emploi sur iPhone ; rien une fois installée. */
export default function InstallButton({ className = '' }: { className?: string }) {
  const mode = useSyncExternalStore(subscribeInstall, currentInstallMode, () => 'none' as const);
  const [help, setHelp] = useState(false);
  useEffect(() => { if (mode !== 'ios') setHelp(false); }, [mode]);
  if (mode === 'installed' || mode === 'none') return null;
  return (
    <div className={`install ${className}`}>
      <button className="btn ghost" onClick={() => (mode === 'prompt' ? promptInstall() : setHelp((h) => !h))} aria-expanded={mode === 'ios' ? help : undefined}>
        📲 Installer l’appli
      </button>
      {help && (
        <p className="install-help" role="note">
          Touche <b>Partager</b> <span aria-hidden>⬆️</span> dans Safari, puis <b>« Sur l’écran d’accueil »</b>.
        </p>
      )}
    </div>
  );
}
