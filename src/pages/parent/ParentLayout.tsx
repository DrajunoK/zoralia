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
        <Link to="/profils" className="back" aria-label="Retour aux profils">⇦</Link>
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
