import { Link } from 'react-router-dom';
import { useChildren, useFamilyCtx, useWallets } from '../state/family';
import { Avatar, Coins, Steps } from '../ui/kit';

export default function Profiles() {
  const { family, theme } = useFamilyCtx();
  const children = useChildren();
  const wallets = useWallets();
  const kids = (children.data ?? []).filter((c) => c.is_active);

  return (
    <main className="profiles">
      <h1><span aria-hidden>{theme.heroEmoji}</span> {family.name}</h1>
      <p className="tagline">Qui part à l’aventure aujourd’hui ?</p>
      <div className="profile-grid">
        {kids.map((c) => (
          <Link key={c.id} to={`/enfant/${c.id}`} className="profile-card">
            <Avatar avatar={c.avatar_key} color={c.color_key} size={96} />
            <strong>{c.display_name}</strong>
            <span className="counters"><Steps n={wallets.data?.find((w) => w.child_id === c.id)?.steps ?? 0} /><Coins n={wallets.data?.find((w) => w.child_id === c.id)?.balance ?? 0} /></span>
          </Link>
        ))}
        {!children.isLoading && kids.length === 0 && <p className="empty">Aucun enfant pour l’instant. Ajoute-en depuis l’espace parent.</p>}
      </div>
      <Link to="/parent" className="btn ghost parent-link">🔑 Espace parent</Link>
    </main>
  );
}
