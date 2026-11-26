import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { useChild } from '../../state/child';
import { useFamilyCtx } from '../../state/family';
import { useLock } from '../../state/lock';
import { Avatar, Coins, Steps } from '../../ui/kit';

// Barre du bas : les 5 écrans du quotidien ; le dé et les badges sont des tuiles sur l'accueil.
const TABS = [
  ['', '🏠', 'Aventure'], ['missions', '⚔️', 'Missions'], ['carte', '🗺️', 'Carte'], ['boutique', '🎁', 'Boutique'], ['tresor', '🏆', 'Trésor'],
] as const;

export default function ChildLayout() {
  const { theme } = useFamilyCtx();
  const { child, balance, steps, loading } = useChild();
  const lock = useLock();
  if (loading) return <div className="splash">Chargement…</div>;
  if (!child || !child.is_active) return <Navigate to="/profils" replace />;
  // Un enfant protégé par un code n'est accessible qu'après l'avoir tapé (lien direct, rechargement, onglet ancien…).
  if (child.has_pin && !lock.childOpen(child.id)) return <Navigate to="/profils" replace />;

  return (
    <div className="shell">
      <header className="hero-bar">
        <Link to="/profils" className="back" aria-label="Changer de profil"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></Link>
        <Avatar avatar={child.avatar_key} color={child.color_key} size={52} />
        <div className="who"><strong>{child.display_name}</strong><Link to="univers" className="theme-chip" aria-label={`Univers : ${theme.name}. Changer`}>{theme.name} 🎨</Link></div>
        <div className="counters"><Steps n={steps} /><Coins n={balance} big /></div>
      </header>
      <main className="page"><Outlet /></main>
      <nav className="bottomnav" aria-label="Navigation"><div className="bottomnav-in">
        {TABS.map(([to, icon, label]) => (
          <NavLink key={to} to={to} end={to === ''} className={({ isActive }) => (isActive ? 'on' : '')}>
            <span aria-hidden>{icon}</span>{label}
          </NavLink>
        ))}
      </div></nav>
    </div>
  );
}
