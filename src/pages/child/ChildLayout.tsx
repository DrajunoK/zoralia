import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { useChild } from '../../state/child';
import { useFamilyCtx } from '../../state/family';
import { Avatar, Coins, Steps } from '../../ui/kit';

const TABS = [
  ['', '🏠', 'Aventure'], ['missions', '⚔️', 'Missions'], ['carte', '🗺️', 'Carte'], ['boutique', '🎁', 'Boutique'],
  ['tresor', '🏆', 'Trésor'], ['de', '🎲', 'Dé'], ['badges', '🏅', 'Badges'],
] as const;

export default function ChildLayout() {
  const { theme } = useFamilyCtx();
  const { child, balance, steps, loading } = useChild();
  if (loading) return <div className="splash">Chargement…</div>;
  if (!child || !child.is_active) return <Navigate to="/profils" replace />;

  return (
    <div className="shell">
      <header className="hero-bar">
        <Link to="/profils" className="back" aria-label="Changer de profil">⇦</Link>
        <Avatar avatar={child.avatar_key} color={child.color_key} size={52} />
        <div className="who"><strong>{child.display_name}</strong><small>{theme.name}</small></div>
        <div className="counters"><Steps n={steps} /><Coins n={balance} big /></div>
      </header>
      <nav className="tabs" aria-label="Navigation">
        {TABS.map(([to, icon, label]) => (
          <NavLink key={to} to={to} end={to === ''} className={({ isActive }) => `tab ${isActive ? 'on' : ''}`}>
            <span aria-hidden>{icon}</span> {label}
          </NavLink>
        ))}
      </nav>
      <main className="page"><Outlet /></main>
    </div>
  );
}
