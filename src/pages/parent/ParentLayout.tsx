import { Link, NavLink, Outlet } from 'react-router-dom';
import { useFamilyCtx } from '../../state/family';

const TABS = [
  ['', '🏠 Famille'], ['enfants', '👧 Enfants'], ['missions', '⚔️ Missions'], ['boutique', '🎁 Boutique'],
  ['tresor', '🏆 Trésor'], ['journal', '📜 Journal'], ['reglages', '⚙️ Réglages'],
] as const;

export default function ParentLayout() {
  const { family } = useFamilyCtx();
  return (
    <div className="shell">
      <header className="hero-bar parent">
        <Link to="/profils" className="back" aria-label="Retour aux profils"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></Link>
        <div className="who"><strong>Espace parent</strong><small>{family.name}</small></div>
      </header>
      <nav className="tabs" aria-label="Navigation parent">
        {TABS.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === ''} className={({ isActive }) => `tab ${isActive ? 'on' : ''}`}>{label}</NavLink>
        ))}
      </nav>
      <main className="page"><Outlet /></main>
    </div>
  );
}
