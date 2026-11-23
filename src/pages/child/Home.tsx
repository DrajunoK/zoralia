import { Link } from 'react-router-dom';
import { MAP_CELLS, STEPS_PER_CELL } from '../../lib/game';
import { useChild } from '../../state/child';
import { useFamilyCtx, useRewards, useTreasure } from '../../state/family';
import { Card, Coins, Empty, Gauge } from '../../ui/kit';
import MissionCard from './MissionCard';

export default function Home() {
  const { theme, settings } = useFamilyCtx();
  const { child, balance, steps, cell, nextAt, territory, chest, missionViews } = useChild();
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
      </Card>

      <Card title="🗺️ Ma carte" action={<Link to="carte" className="link">Voir la carte</Link>}>
        <p><b>{cell}</b> / {MAP_CELLS} étapes · {theme.territories[territory]}</p>
        <Gauge value={steps % STEPS_PER_CELL} max={STEPS_PER_CELL} label="Progression vers l’étape suivante" />
        <p className="muted">{nextAt ? `Encore ${nextAt - steps} pas pour la prochaine étape.` : 'Tu as atteint le bout de la carte !'}</p>
        {chest && <p className="muted">🧰 Prochain coffre dans <b>{chest.missing} pas</b> : +{chest.value} <span aria-hidden>{theme.coin}</span> pépites</p>}
      </Card>

      <Card title="⚔️ Missions du jour" action={<Link to="missions" className="link">Toutes les missions</Link>}>
        {todo.length === 0 ? <Empty>Plus rien à faire aujourd’hui, bravo ! 🎉</Empty>
          : <ul className="list">{todo.map((v) => <MissionCard key={v.mission.id} view={v} childId={child.id} />)}</ul>}
      </Card>

      <div className="two-col">
        <Card title="🎁 Boutique" action={<Link to="boutique" className="link">Voir la boutique</Link>}>
          {affordable.length === 0 ? <Empty>Ouvre des coffres sur la carte pour gagner des pépites !</Empty>
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
      <div className="tiles">
        {settings.dice_enabled && <Link to="de" className="tile" style={{ '--t': '#ff6f9c' } as React.CSSProperties}><span className="ic" aria-hidden>🎲</span>Dé du destin</Link>}
        <Link to="badges" className="tile" style={{ '--t': '#8b5cf6' } as React.CSSProperties}><span className="ic" aria-hidden>🏅</span>Mes badges</Link>
      </div>
    </>
  );
}
