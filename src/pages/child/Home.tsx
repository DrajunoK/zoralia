import { Link } from 'react-router-dom';
import { POINTS_PER_STEP } from '../../lib/game';
import { useChild } from '../../state/child';
import { useFamilyCtx, useRewards, useTreasure } from '../../state/family';
import { Card, Coins, Empty, Gauge } from '../../ui/kit';
import MissionCard from './MissionCard';

export default function Home() {
  const { theme, settings } = useFamilyCtx();
  const { child, balance, lifetime, step, nextAt, territory, missionViews } = useChild();
  const rewards = useRewards();
  const treasure = useTreasure();
  if (!child) return null;

  const todo = missionViews.filter((v) => v.state === 'available' || v.state === 'claimed').slice(0, 4);
  const affordable = (rewards.data ?? []).filter((r) => r.is_active && r.cost <= balance).slice(0, 2);
  const t = treasure.data;

  return (
    <>
      <Card className="welcome">
        <h1>Bienvenue dans ton aventure, {child.display_name} ! <span aria-hidden>{theme.heroEmoji}</span></h1>
        <Coins n={balance} big />
      </Card>

      <Card title="🗺️ Ma carte" action={<Link to="carte" className="link">Voir la carte</Link>}>
        <p><b>{step}</b> / 50 étapes · {theme.territories[territory]}</p>
        <Gauge value={step} max={50} label="Progression sur la carte" />
        <p className="muted">{nextAt ? `Prochaine étape à ${nextAt} pépites gagnées (encore ${nextAt - lifetime}).` : 'Tu as atteint le bout de la carte !'}</p>
        <small className="muted">1 étape toutes les {POINTS_PER_STEP} pépites gagnées.</small>
      </Card>

      <Card title="⚔️ Missions du jour" action={<Link to="missions" className="link">Toutes les missions</Link>}>
        {todo.length === 0 ? <Empty>Plus rien à faire aujourd’hui, bravo ! 🎉</Empty>
          : <ul className="list">{todo.map((v) => <MissionCard key={v.mission.id} view={v} childId={child.id} />)}</ul>}
      </Card>

      <div className="two-col">
        <Card title="🎁 Boutique" action={<Link to="boutique" className="link">Voir la boutique</Link>}>
          {affordable.length === 0 ? <Empty>Continue à gagner des pépites !</Empty>
            : <ul className="list">{affordable.map((r) => <li key={r.id}><span>{r.title}</span><Coins n={r.cost} /></li>)}</ul>}
        </Card>
        {settings.treasure_enabled && t && t.status !== 'archived' && (
          <Card title="🏆 Trésor commun" action={<Link to="tresor" className="link">Contribuer</Link>}>
            <p>{t.title}</p>
            <Gauge value={t.current_points} max={t.target_points} label="Trésor commun" />
            <p className="muted">{t.current_points} / {t.target_points} pépites</p>
          </Card>
        )}
      </div>
      {settings.dice_enabled && <Link to="de" className="btn ghost wide">🎲 Dé du destin</Link>}
    </>
  );
}
