import { useState } from 'react';
import { isCompletePin } from '../lib/lock';

interface Props {
  /** Texte du bouton principal (« Enregistrer le code »…). */
  label: string;
  /** Vrai quand un code existe déjà (affiche « Supprimer le code »). */
  hasPin?: boolean;
  onSave: (pin: string) => Promise<unknown>;
  onRemove?: () => Promise<unknown>;
  /** Demande une seconde saisie identique (pour le code parent, qu'on ne veut pas rater). */
  confirm?: boolean;
}

/** Saisie d'un code à 4 chiffres pour le parent : champ numérique, éventuelle confirmation, boutons enregistrer / supprimer. */
export default function PinEditor({ label, hasPin, onSave, onRemove, confirm }: Props) {
  const [pin, setPin] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 4);
  const mismatch = confirm && isCompletePin(pin) && again.length === 4 && again !== pin;
  const ready = isCompletePin(pin) && (!confirm || again === pin);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); setPin(''); setAgain(''); } finally { setBusy(false); }
  }

  return (
    <div className="pin-editor">
      <div className="row wrap">
        <label className="field"><span>Code à 4 chiffres</span>
          <input inputMode="numeric" autoComplete="off" pattern="[0-9]*" maxLength={4} placeholder="••••" value={pin} onChange={(e) => setPin(digits(e.target.value))} className="pin-input" aria-label="Nouveau code" />
        </label>
        {confirm && (
          <label className="field"><span>Confirmer</span>
            <input inputMode="numeric" autoComplete="off" pattern="[0-9]*" maxLength={4} placeholder="••••" value={again} onChange={(e) => setAgain(digits(e.target.value))} className="pin-input" aria-label="Confirmer le code" />
          </label>
        )}
        <button className="btn" disabled={!ready || busy} onClick={() => run(() => onSave(pin))}>{label}</button>
        {hasPin && onRemove && <button className="btn ghost" disabled={busy} onClick={() => run(onRemove)}>Supprimer le code</button>}
      </div>
      {mismatch && <small className="bad" role="alert">Les deux codes ne sont pas identiques.</small>}
    </div>
  );
}
