import { useEffect, useRef, useState } from 'react';
import { isCompletePin } from '../lib/lock';

interface Props {
  title: string;
  subtitle?: string;
  /** Renvoie vrai si le code est bon ; la fenêtre se ferme alors d'elle-même côté appelant. */
  onSubmit: (pin: string) => Promise<boolean>;
  onCancel: () => void;
}

/** Clavier de saisie d'un code à 4 chiffres : gros boutons, point par chiffre, secousse si le code est faux. */
export default function PinPad({ title, subtitle, onSubmit, onCancel }: Props) {
  const [pin, setPin] = useState('');
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);

  const press = (d: string) => { if (!busy) { setBad(false); setPin((p) => (p.length < 4 ? p + d : p)); } };
  const back = () => { if (!busy) { setBad(false); setPin((p) => p.slice(0, -1)); } };

  useEffect(() => {
    if (!isCompletePin(pin) || busy) return;
    setBusy(true);
    onSubmit(pin).then((ok) => { if (!ok) { setBad(true); setPin(''); } }).catch(() => { setBad(true); setPin(''); }).finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
      else if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  return (
    <div className="pin-backdrop" role="presentation" onClick={onCancel}>
      <div ref={dialog} className={`pin-card ${bad ? 'shake' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
        <div className="pin-dots" aria-live="polite" aria-label={`${pin.length} chiffre${pin.length > 1 ? 's' : ''} sur 4`}>
          {[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}
        </div>
        <p className={`pin-msg ${bad ? 'show' : ''}`} role="alert">{bad ? 'Ce n’est pas le bon code, réessaie.' : ' '}</p>
        <div className="pin-keys">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} type="button" onClick={() => press(d)}>{d}</button>)}
          <button type="button" className="alt" onClick={onCancel} aria-label="Annuler"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></button>
          <button type="button" onClick={() => press('0')}>0</button>
          <button type="button" className="alt" onClick={back} aria-label="Effacer le dernier chiffre"><svg width="28" height="24" viewBox="0 0 28 24" aria-hidden="true"><path d="M9 3h15a2 2 0 012 2v14a2 2 0 01-2 2H9L2 12z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" /><path d="M13 8l7 8M20 8l-7 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg></button>
        </div>
      </div>
    </div>
  );
}
