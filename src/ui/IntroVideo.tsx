import { useEffect, useRef, useState } from 'react';

const SRC = '/video/zoralia-aventure.mp4';

/** Lecteur de la vidéo « Comment ça marche ? » : plein écran sur téléphone, fermeture à la touche Échap. */
export function IntroVideoPlayer({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    video.current?.play().catch(() => undefined); // l'appui sur le bouton compte comme un geste : la lecture démarre seule
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="video-backdrop" role="presentation" onClick={onClose}>
      <div className="video-card" role="dialog" aria-modal="true" aria-label="Comment fonctionne Zoralia ?" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="video-close" onClick={onClose} aria-label="Fermer la vidéo">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
        </button>
        <video ref={video} controls playsInline preload="metadata" poster="/video/zoralia-aventure.jpg">
          <source src={SRC} type="video/mp4" />
          Ton navigateur ne sait pas lire cette vidéo.
        </video>
        <p className="video-credit">Voix de synthèse (Piper, modèle « siwis », CC BY 4.0), rendue plus aiguë. Musique et bruitages créés pour Zoralia.</p>
      </div>
    </div>
  );
}

/** Bouton « C'est quoi Zoralia ? » qui ouvre le lecteur. */
export default function IntroVideoButton({ className = '', label = '🎬 C’est quoi Zoralia ?' }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`btn ghost ${className}`} onClick={() => setOpen(true)}>{label}</button>
      {open && <IntroVideoPlayer onClose={() => setOpen(false)} />}
    </>
  );
}
