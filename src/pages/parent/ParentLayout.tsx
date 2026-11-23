import { Link, NavLink, Outlet } from 'react-router-dom';
import { useFamilyCtx, useOccurrences, useRedemptions } from '../../state/family';

const TABS = [
  ['', '🏠 Famille'], ['enfants', '👧 Enfants'], ['missions', '⚔️ Missions'], ['boutique', '🎁 Boutique'],
  ['tresor', '🏆 Trésor'], ['journal', '📜 Journal'], ['reglages', '⚙️ Réglages'],
] as const;

export default function ParentLayout() {
  const { family } = useFamilyCtx();
  const occurrences = useOccurrences();
  const redemptions = useRedemptions();
  const waiting = (occurrences.data ?? []).filter((o) => o.status === 'claimed').length + (redemptions.data ?? []).filter((r) => r.status === 'requested').length;
  return (
    <div className="shell">
      <header className="hero-bar parent">
        <Link to="/profils" className="back" aria-label="Retour aux profils"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></Link>
        <div className="who"><strong>Espace parent</strong><small>{family.name}</small></div>
      </header>
      <nav className="tabs" aria-label="Navigation parent">
        {TABS.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === ''} className={({ isActive }) => `tab ${isActive ? 'on' : ''}`}>{label}{to === '' && waiting > 0 && <b className="tab-dot" aria-label={`${waiting} en attente`}>{waiting}</b>}</NavLink>
        ))}
      </nav>
      <main className="page"><Outlet /></main>
    </div>
  );
}
