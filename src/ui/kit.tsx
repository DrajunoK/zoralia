import type { ReactNode } from 'react';
import { AVATARS, COLORS } from '../lib/themes';
import { useFamilyCtx } from '../state/family';

export function Avatar({ avatar, color, size = 48 }: { avatar: string; color: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.55, background: COLORS[color] ?? COLORS.sun }} aria-hidden>
      {AVATARS[avatar] ?? '🦊'}
    </span>
  );
}

export function Coins({ n, big }: { n: number; big?: boolean }) {
  const { theme } = useFamilyCtx();
  return <span className={`coins ${big ? 'big' : ''}`}><span aria-hidden>{theme.coin}</span> {n} <span className="sr">pépites</span></span>;
}

/** Une empreinte de pied : l'icône des pas (missions → carte). */
export function Footprint({ className = '' }: { className?: string }) {
  return (
    <svg className={`foot ${className}`} viewBox="14 4 48 68" aria-hidden="true" focusable="false">
      <path d="M30 24 C44 22 54 32 52 46 C51 54 49 58 47 63 C45 69 40 71 35 70 C29 69 25 64 24 57 C23 50 21 46 20 40 C19 32 22 25 30 24 Z" />
      <ellipse cx="22.5" cy="17" rx="7.2" ry="8.6" transform="rotate(-12 22.5 17)" />
      <ellipse cx="36" cy="11.5" rx="5.4" ry="6.4" transform="rotate(-4 36 11.5)" />
      <ellipse cx="46" cy="14.5" rx="4.8" ry="5.8" transform="rotate(8 46 14.5)" />
      <ellipse cx="53.5" cy="21" rx="4.2" ry="5.2" transform="rotate(18 53.5 21)" />
      <ellipse cx="58" cy="30" rx="3.6" ry="4.6" transform="rotate(26 58 30)" />
    </svg>
  );
}

/** Pas : la monnaie de la carte (gagnée avec les missions, jamais dépensée). */
export function Steps({ n, big }: { n: number; big?: boolean }) {
  return <span className={`coins ${big ? 'big' : ''}`}><Footprint /> {n} <span className="sr">pas</span></span>;
}

export function Gauge({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="gauge" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Card({ title, children, action, className = '' }: { title?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && <header className="card-head">{title && <h2>{title}</h2>}{action}</header>}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function AvatarPicker({ avatar, color, onChange }: { avatar: string; color: string; onChange: (v: { avatar: string; color: string }) => void }) {
  return (
    <div className="picker">
      <div className="picker-row" role="radiogroup" aria-label="Avatar">
        {Object.entries(AVATARS).map(([k, e]) => (
          <button type="button" key={k} role="radio" aria-checked={avatar === k} aria-label={k}
            className={`chip ${avatar === k ? 'on' : ''}`} onClick={() => onChange({ avatar: k, color })}>{e}</button>
        ))}
      </div>
      <div className="picker-row" role="radiogroup" aria-label="Couleur">
        {Object.entries(COLORS).map(([k, c]) => (
          <button type="button" key={k} role="radio" aria-checked={color === k} aria-label={k}
            className={`swatch ${color === k ? 'on' : ''}`} style={{ background: c }} onClick={() => onChange({ avatar, color: k })} />
        ))}
      </div>
    </div>
  );
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
