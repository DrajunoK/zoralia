import type { ReactNode } from 'react';
import { AVATARS, COLORS } from '../lib/themes';

export function Avatar({ avatar, color, size = 48 }: { avatar: string; color: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.55, background: COLORS[color] ?? COLORS.sun }} aria-hidden>
      {AVATARS[avatar] ?? '🦊'}
    </span>
  );
}

/** Pépite : une pépite d'or (public/icons/pepite.svg). */
export function Nugget({ className = '' }: { className?: string }) {
  return <img className={`ico nugget ${className}`} src="/icons/pepite.svg" alt="" aria-hidden="true" draggable={false} />;
}

/** Pas : l'empreinte blanche sur pastille orange (public/icons/pas.svg). */
export function Footprint({ className = '' }: { className?: string }) {
  return <img className={`ico foot ${className}`} src="/icons/pas.svg" alt="" aria-hidden="true" draggable={false} />;
}

export function Coins({ n, big }: { n: number; big?: boolean }) {
  return <span className={`coins ${big ? 'big' : ''}`}><Nugget /> {n} <span className="sr">pépites</span></span>;
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

/** Bandeau coloré qui ouvre un groupe (catégorie de missions, palier de la boutique). */
export function Banner({ icon, label, count, hint, color }: { icon: string; label: string; count: number; hint?: string; color: string }) {
  return (
    <h3 className="cat-head" style={{ ['--c' as string]: color } as React.CSSProperties}>
      <span aria-hidden>{icon}</span> {label} <b>{count}</b>{hint && <small>{hint}</small>}
    </h3>
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

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
